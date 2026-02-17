"use client";

import { useEffect, useState, Suspense } from "react";
import { format, isPast, isToday, addDays, parseISO, isValid } from "date-fns";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

interface Ticket {
  assigned_to_user: string;
  order_assigned_to_name: string;
  delivery_date: string;
  description: string;
  id: string;
  ticket_number: string;
  subject: string;
  status_name: string;
  due_date: string;
  created_at: string;
  customer_name?: string;
  assigned_to_name?: string;
  type?: string;
  size?: string;
  pub_name?: string;
  iss_name?: string;
  last_updated?: string;
}

type SortField = "due_date" | "pub_name" | "last_updated";

function HomeContent() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const serviceFilter = searchParams.get("serviceFilter") || "all";
  const serviceSort = (searchParams.get("serviceSort") as SortField) || "due_date";
  const adFilter = searchParams.get("adFilter") || "all";
  const adSort = (searchParams.get("adSort") as SortField) || "due_date";

  const updateQueryParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === "all" || (key.endsWith("Sort") && value === "due_date")) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  const setServiceFilter = (v: string) => updateQueryParams({ serviceFilter: v });
  const setServiceSort = (v: SortField) => updateQueryParams({ serviceSort: v });
  const setAdFilter = (v: string) => updateQueryParams({ adFilter: v });
  const setAdSort = (v: SortField) => updateQueryParams({ adSort: v });

  useEffect(() => {
    async function fetchTickets() {
      try {
        const response = await fetch("/api");
        if (!response.ok) {
          throw new Error("Failed to fetch tickets");
        }
        const data = await response.json();
        
        // Sorting by due date (ascending), falling back to delivery_date
        const sortedTickets = data.sort((a: Ticket, b: Ticket) => {
          const getEffectiveDateString = (ticket: Ticket) => {
            if (ticket.due_date && ticket.due_date !== "0000-00-00") {
              return ticket.due_date;
            }
            return ticket.delivery_date;
          };

          const dateStrA = getEffectiveDateString(a);
          const dateStrB = getEffectiveDateString(b);

          if (!dateStrA) return 1;
          if (!dateStrB) return -1;
          
          let dateA = parseISO(dateStrA);
          if (!isValid(dateA)) dateA = new Date(dateStrA);
          
          let dateB = parseISO(dateStrB);
          if (!isValid(dateB)) dateB = new Date(dateStrB);

          const timeA = isValid(dateA) ? dateA.getTime() : Number.MAX_SAFE_INTEGER;
          const timeB = isValid(dateB) ? dateB.getTime() : Number.MAX_SAFE_INTEGER;
          
          return timeA - timeB;
        });

        setTickets(sortedTickets);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchTickets();
  }, []);

  const getStatusColor = (ticket: Ticket) => {
    const dateStr = (ticket.due_date && ticket.due_date !== "0000-00-00") 
      ? ticket.due_date 
      : ticket.delivery_date;

    if (!dateStr) return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700";
    
    let date = parseISO(dateStr);
    
    if (!isValid(date)) {
      date = new Date(dateStr);
    }

    if (!isValid(date)) return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700";

    if (isPast(date) && !isToday(date)) {
      return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800"; // Past due
    }
    if (isToday(date)) {
      return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800"; // Due today
    }
    
    const tenDaysFromNow = addDays(new Date(), 10);
    if (date <= tenDaysFromNow) {
      return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800"; // Due soon (within 3 days)
    }
    return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800"; // Safe
  };

  const formatTicketDate = (ticket: Ticket) => {
    const isUsingDueDate = ticket.due_date && ticket.due_date !== "0000-00-00";
    const dateStr = isUsingDueDate ? ticket.due_date : ticket.delivery_date;
    const label = isUsingDueDate ? "Due" : "Delivery";

    if (!dateStr) return "No date set";
    
    let date = parseISO(dateStr);
    if (!isValid(date)) {
      date = new Date(dateStr);
    }
    
    if (!isValid(date)) {
      console.warn(`Invalid date encountered: ${dateStr}`);
      return "Invalid date";
    }
    
    return `${label}: ${format(date, "MMM d, yyyy")}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-xl font-medium dark:text-white">Loading tickets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="rounded-lg bg-red-50 p-8 text-center dark:bg-red-900/20">
          <p className="text-xl font-medium text-red-600 dark:text-red-400">Error</p>
          <p className="mt-2 text-gray-600 dark:text-zinc-400">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const serviceTickets = tickets.filter(t => t.type?.toLowerCase().includes('service'));
  const adTickets = tickets.filter(t => t.type?.toLowerCase().includes('ad') || (!t.type?.toLowerCase().includes('service')));

  const getEffectiveDate = (ticket: Ticket) => {
    if (ticket.due_date && ticket.due_date !== "0000-00-00") {
      return ticket.due_date;
    }
    return ticket.delivery_date;
  };

  const sortTickets = (list: Ticket[], field: SortField) => {
    return [...list].sort((a, b) => {
      if (field === "due_date") {
        const dateStrA = getEffectiveDate(a);
        const dateStrB = getEffectiveDate(b);
        if (!dateStrA) return 1;
        if (!dateStrB) return -1;
        let dateA = parseISO(dateStrA);
        if (!isValid(dateA)) dateA = new Date(dateStrA);
        let dateB = parseISO(dateStrB);
        if (!isValid(dateB)) dateB = new Date(dateStrB);
        const timeA = isValid(dateA) ? dateA.getTime() : Number.MAX_SAFE_INTEGER;
        const timeB = isValid(dateB) ? dateB.getTime() : Number.MAX_SAFE_INTEGER;
        return timeA - timeB;
      } 
      if (field === "pub_name") {
        return (a.pub_name || "").localeCompare(b.pub_name || "");
      }
      if (field === "last_updated") {
        const dateStrA = a.last_updated;
        const dateStrB = b.last_updated;
        if (!dateStrA) return 1;
        if (!dateStrB) return -1;
        let dateA = parseISO(dateStrA);
        if (!isValid(dateA)) dateA = new Date(dateStrA);
        let dateB = parseISO(dateStrB);
        if (!isValid(dateB)) dateB = new Date(dateStrB);
        const timeA = isValid(dateA) ? dateA.getTime() : 0;
        const timeB = isValid(dateB) ? dateB.getTime() : 0;
        return timeB - timeA; // Newest first for last update
      }
      return 0;
    });
  };

  const filterTickets = (list: Ticket[], filter: string) => {
    if (filter === "all") return list;
    return list.filter(t => t.assigned_to_user === filter);
  };

  const processedServiceTickets = sortTickets(filterTickets(serviceTickets, serviceFilter), serviceSort);
  const processedAdTickets = sortTickets(filterTickets(adTickets, adFilter), adSort);

  const getAssignees = (list: Ticket[]) => {
    const assignees = new Set<string>();
    list.forEach(t => {
      if (t.assigned_to_user) assignees.add(t.assigned_to_user);
    });
    return Array.from(assignees).sort();
  };

  const serviceAssignees = getAssignees(serviceTickets);
  const adAssignees = getAssignees(adTickets);

  const TicketList = ({ 
    title, 
    ticketsList, 
    filter, 
    setFilter, 
    sort, 
    setSort,
    assignees 
  }: { 
    title: string; 
    ticketsList: Ticket[]; 
    filter: string;
    setFilter: (v: string) => void;
    sort: SortField;
    setSort: (v: SortField) => void;
    assignees: string[];
  }) => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-zinc-200">{title} ({ticketsList.length})</h2>
        <div className="flex flex-wrap items-center gap-2">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="text-xs rounded border-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 p-1"
          >
            <option value="all">All Assigned</option>
            {assignees.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <div className="flex items-center bg-gray-100 dark:bg-zinc-800 rounded p-0.5">
            <div className="text-sm px-2">Sort by:</div>
            <button 
              onClick={() => setSort("due_date")}
              className={`cursor-pointer text-[10px] px-2 py-1 rounded ${sort === "due_date" ? "bg-white dark:bg-zinc-700 shadow-sm font-bold" : "text-gray-500"}`}
            >
              Due Date
            </button>
            <button 
              onClick={() => setSort("pub_name")}
              className={`cursor-pointer text-[10px] px-2 py-1 rounded ${sort === "pub_name" ? "bg-white dark:bg-zinc-700 shadow-sm font-bold" : "text-gray-500"}`}
            >
              Publication
            </button>
            <button 
              onClick={() => setSort("last_updated")}
              className={`cursor-pointer text-[10px] px-2 py-1 rounded ${sort === "last_updated" ? "bg-white dark:bg-zinc-700 shadow-sm font-bold" : "text-gray-500"}`}
            >
              Updated
            </button>
          </div>
        </div>
      </div>
      <div className="bg-white shadow overflow-hidden sm:rounded-md dark:bg-zinc-900">
        <ul role="list" className="divide-y divide-gray-200 dark:divide-zinc-800">
          {ticketsList.length === 0 ? (
            <li className="px-6 py-12 text-center text-gray-500">No {title.toLowerCase()} tickets found.</li>
          ) : (
            ticketsList.map((ticket) => (
              <Link key={ticket.id} href={`https://evergreenmedia.adorbit.com/tickets/ticket/?id=${ticket.id}`}>
                <li className="hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                  <div className="px-4 py-5 sm:px-6">
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-semibold">
                        <div className="text-gray-400 dark:text-zinc-500">
                          Last Updated: {ticket.last_updated ? format(parseISO(ticket.last_updated), "MMM d, h:mm a") : "N/A"}
                        </div>
                        <div className={`px-2 py-0.5 rounded-full border ${getStatusColor(ticket)}`}>
                          {formatTicketDate(ticket)}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <p className="text-sm max-w-96 font-medium text-indigo-600 dark:text-indigo-400">
                            #{ticket.ticket_number || ticket.id} - {ticket.subject || ticket.description}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-xs text-gray-500 dark:text-zinc-500">
                              Status: <span className="font-semibold text-gray-700 dark:text-zinc-300">{ticket.status_name}</span>
                            </span>
                            {ticket.customer_name && (
                              <>
                                <span className="text-xs text-gray-500 dark:text-zinc-500">•</span>
                                <span className="text-xs text-gray-500 dark:text-zinc-500">
                                  Customer: <span className="font-semibold text-gray-700 dark:text-zinc-300">{ticket.customer_name}</span>
                                </span>
                              </>
                            )}
                            {ticket.pub_name && (
                              <>
                                <span className="text-xs text-gray-500 dark:text-zinc-500">•</span>
                                <span className="text-xs text-gray-500 dark:text-zinc-500">
                                  Pub: <span className="font-semibold text-gray-700 dark:text-zinc-300">{ticket.pub_name}</span>
                                </span>
                              </>
                            )}
                            {ticket.iss_name && (
                              <>
                                <span className="text-xs text-gray-500 dark:text-zinc-500">•</span>
                                <span className="text-xs text-gray-500 dark:text-zinc-500">
                                  Issue: <span className="font-semibold text-gray-700 dark:text-zinc-300">{ticket.iss_name}</span>
                                </span>
                              </>
                            )}
                          </div>

                          {/* Assigned To Section */}
                          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                            <span className="text-xs text-gray-600 dark:text-zinc-400">
                              <span className="font-medium">Assigned to:</span> {ticket.assigned_to_user || "Unassigned"}
                            </span>
                            {ticket.size && (
                              <span className="text-xs text-gray-600 dark:text-zinc-400">
                                <span className="font-medium">Size:</span> {ticket.size}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              </Link>
            ))
          )}
        </ul>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4 sm:px-6 lg:px-8 dark:bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Active Support Tickets</h1>
          <p className="mt-2 text-gray-600 dark:text-zinc-400">
            A list of all active tickets separated by type, with per-column filtering and sorting.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <TicketList 
            title="Service Tickets" 
            ticketsList={processedServiceTickets} 
            filter={serviceFilter}
            setFilter={setServiceFilter}
            sort={serviceSort}
            setSort={setServiceSort}
            assignees={serviceAssignees}
          />
          <TicketList 
            title="Ad Tickets" 
            ticketsList={processedAdTickets} 
            filter={adFilter}
            setFilter={setAdFilter}
            sort={adSort}
            setSort={setAdSort}
            assignees={adAssignees}
          />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-xl font-medium dark:text-white">Loading...</p>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
