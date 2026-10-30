import React from "react";
import ReactDOMServer from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import dayjs from "dayjs";
import CalendarPage from "./CalendarPage";

describe("CalendarPage", () => {
  it("renders a six-week grid and uses the app's pastel category palette", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(["events"], [
      {
        event_id: "event_1",
        title: "Brand call",
        date: dayjs().format("YYYY-MM-DD"),
        type: "campaign",
      },
    ]);

    const html = ReactDOMServer.renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <CalendarPage />
      </QueryClientProvider>
    );

    expect(html).toContain('data-testid="month-grid"');
    expect(html.match(/data-testid="calendar-day-\d{4}-\d{2}-\d{2}"/g)).toHaveLength(42);
    expect(html).toContain('class="calendar-event-chip calendar-event-blue"');
    expect(html).toContain("Brand call");
  });
});
