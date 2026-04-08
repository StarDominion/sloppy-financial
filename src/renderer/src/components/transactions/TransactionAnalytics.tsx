import { useEffect, useState } from "react";
import { onDataChange } from "../../dataEvents";
import { TransactionTable } from "../common/TransactionTable";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const TYPE_COLORS: Record<string, string> = {
  deposit: "#2da44e",
  withdrawal: "#cf222e",
};

const TAG_CHART_COLORS = [
  "#0969da",
  "#2da44e",
  "#bf8700",
  "#8957e5",
  "#cf222e",
  "#0550ae",
  "#1a7f37",
  "#953800",
  "#6e2c8c",
  "#a40e26",
];

type ViewType = "tag" | "type" | "timeline" | "description" | "tag-timeline";
type ChartType = "pie" | "bar" | "area" | "line";

interface TransactionAnalyticsProps {
  profileId: number;
}

export function TransactionAnalytics({
  profileId,
}: TransactionAnalyticsProps): React.JSX.Element {
  // View and chart state
  const [activeView, setActiveView] = useState<ViewType>("tag");
  const [chartType, setChartType] = useState<ChartType>("pie");
  const [timeGranularity, setTimeGranularity] = useState<"day" | "week" | "month" | "year">("month");

  // Filter state
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [descriptionFilters, setDescriptionFilters] = useState<string[]>([]);
  const [descriptionInput, setDescriptionInput] = useState<string>("");
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [availableTags, setAvailableTags] = useState<Array<{ id: number; name: string; color: string }>>([]);

  // Data state
  const [tagData, setTagData] = useState<any[]>([]);
  const [typeData, setTypeData] = useState<any[]>([]);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [descriptionData, setDescriptionData] = useState<any[]>([]);
  const [tagTimelineData, setTagTimelineData] = useState<any[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load tags list for tag-timeline view
  useEffect(() => {
    window.api.tags.list(profileId).then(setAvailableTags);
    return onDataChange("transactions", () => {
      window.api.tags.list(profileId).then(setAvailableTags);
    });
  }, [profileId]);

  // Load data based on active view
  useEffect(() => {
    loadData();
    return onDataChange("transactions", loadData);
  }, [profileId, activeView, startDate, endDate, timeGranularity, descriptionFilters, selectedTagId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update chart type when view changes
  useEffect(() => {
    switch (activeView) {
      case "tag":
        setChartType("pie");
        break;
      case "type":
        setChartType("bar");
        break;
      case "timeline":
        setChartType("area");
        break;
      case "description":
        setChartType("bar");
        break;
      case "tag-timeline":
        setChartType("area");
        break;
    }
  }, [activeView]);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const dateParams = {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };

      switch (activeView) {
        case "tag":
          const tags = await window.api.transactions.aggregateByTag(
            profileId,
            dateParams.startDate,
            dateParams.endDate,
          );
          setTagData(tags);
          break;

        case "type":
          const types = await window.api.transactions.aggregateByType(
            profileId,
            dateParams.startDate,
            dateParams.endDate,
          );
          setTypeData(types);
          break;

        case "timeline":
          const timeline = await window.api.transactions.aggregateByPeriod(
            profileId,
            timeGranularity,
            dateParams.startDate,
            dateParams.endDate,
          );
          setTimelineData(timeline);
          break;

        case "description":
          if (descriptionFilters.length > 0) {
            const descriptions = await window.api.transactions.aggregateByDescription(
              profileId,
              descriptionFilters,
              dateParams.startDate,
              dateParams.endDate,
            );
            setDescriptionData(descriptions);
          } else {
            setDescriptionData([]);
          }
          break;

        case "tag-timeline":
          if (selectedTagId !== null) {
            const tagTimeline = await window.api.transactions.aggregateByTagTimeline(
              profileId,
              selectedTagId,
              timeGranularity,
              dateParams.startDate,
              dateParams.endDate,
            );
            setTagTimelineData(tagTimeline);
          } else {
            setTagTimelineData([]);
          }
          break;
      }
      // Load filtered transactions for the list
      const filterOptions: { startDate?: string; endDate?: string; tagId?: number; descriptionSubstrings?: string[] } = {};
      if (startDate) filterOptions.startDate = startDate;
      if (endDate) filterOptions.endDate = endDate;
      if (activeView === "tag-timeline" && selectedTagId !== null) filterOptions.tagId = selectedTagId;
      if (activeView === "description" && descriptionFilters.length > 0) filterOptions.descriptionSubstrings = descriptionFilters;
      const txns = await window.api.transactions.listFiltered(profileId, filterOptions);
      setFilteredTransactions(txns);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
      console.error("Failed to load analytics data:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleAddDescriptionFilter() {
    if (descriptionInput.trim() && !descriptionFilters.includes(descriptionInput.trim())) {
      setDescriptionFilters([...descriptionFilters, descriptionInput.trim()]);
      setDescriptionInput("");
    }
  }

  function handleRemoveDescriptionFilter(filter: string) {
    setDescriptionFilters(descriptionFilters.filter((f) => f !== filter));
  }

  function calculateSummaryStats() {
    let data: any[] = [];
    let countKey = "transaction_count";
    let amountKey = "total_amount";

    switch (activeView) {
      case "tag":
        data = tagData;
        break;
      case "type":
        data = typeData;
        break;
      case "timeline":
        data = timelineData;
        break;
      case "description":
        data = descriptionData;
        break;
      case "tag-timeline":
        data = tagTimelineData;
        break;
    }

    const totalTransactions = data.reduce((sum, item) => sum + Number(item[countKey] || 0), 0);
    const totalAmount = data.reduce((sum, item) => sum + Number(item[amountKey] || 0), 0);
    const avgAmount = totalTransactions > 0 ? totalAmount / totalTransactions : 0;

    return { totalTransactions, totalAmount, avgAmount };
  }

  function renderChart() {
    if (loading) {
      return <div className="analytics-loading">Loading chart data...</div>;
    }

    if (error) {
      return <div className="analytics-error">Error: {error}</div>;
    }

    switch (activeView) {
      case "tag":
        return renderTagChart();
      case "type":
        return renderTypeChart();
      case "timeline":
        return renderTimelineChart();
      case "description":
        return renderDescriptionChart();
      case "tag-timeline":
        return renderTagTimelineChart();
    }
  }

  function renderTagChart() {
    if (tagData.length === 0) {
      return <div className="analytics-empty">No transaction data available</div>;
    }

    if (chartType === "pie") {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={tagData}
              dataKey="total_amount"
              nameKey="tag_name"
              cx="50%"
              cy="50%"
              outerRadius={120}
              label={(entry: any) => `${entry.tag_name}: $${Number(entry.total_amount).toFixed(2)}`}
            >
              {tagData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.tag_color !== "#656d76" ? entry.tag_color : TAG_CHART_COLORS[index % TAG_CHART_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: "#252526", border: "1px solid #3e3e42" }}
              formatter={(value: any) => `$${Number(value).toFixed(2)}`}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );
    } else {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={tagData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3e3e42" />
            <XAxis dataKey="tag_name" stroke="#cccccc" />
            <YAxis stroke="#cccccc" />
            <Tooltip
              contentStyle={{ backgroundColor: "#252526", border: "1px solid #3e3e42" }}
              formatter={(value: any) => `$${Number(value).toFixed(2)}`}
            />
            <Legend />
            <Bar dataKey="total_amount" fill="#0969da" name="Total Amount" />
            <Bar dataKey="deposit_amount" fill="#2da44e" name="Deposits" />
            <Bar dataKey="withdrawal_amount" fill="#cf222e" name="Withdrawals" />
          </BarChart>
        </ResponsiveContainer>
      );
    }
  }

  function renderTypeChart() {
    if (typeData.length === 0) {
      return <div className="analytics-empty">No transaction data available</div>;
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={typeData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3e3e42" />
          <XAxis dataKey="type" stroke="#cccccc" />
          <YAxis stroke="#cccccc" />
          <Tooltip
            contentStyle={{ backgroundColor: "#252526", border: "1px solid #3e3e42" }}
            formatter={(value: any, name?: string) => {
              if (name === "transaction_count") return Number(value);
              return `$${Number(value).toFixed(2)}`;
            }}
          />
          <Legend />
          <Bar dataKey="total_amount" name="Total Amount">
            {typeData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={TYPE_COLORS[entry.type] || "#656d76"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  function renderTimelineChart() {
    if (timelineData.length === 0) {
      return <div className="analytics-empty">No transaction data available</div>;
    }

    if (chartType === "area") {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3e3e42" />
            <XAxis dataKey="period" stroke="#cccccc" />
            <YAxis stroke="#cccccc" />
            <Tooltip
              contentStyle={{ backgroundColor: "#252526", border: "1px solid #3e3e42" }}
              formatter={(value: any) => `$${Number(value).toFixed(2)}`}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="deposit_amount"
              stackId="1"
              stroke="#2da44e"
              fill="#2da44e"
              name="Deposits"
            />
            <Area
              type="monotone"
              dataKey="withdrawal_amount"
              stackId="1"
              stroke="#cf222e"
              fill="#cf222e"
              name="Withdrawals"
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    } else {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3e3e42" />
            <XAxis dataKey="period" stroke="#cccccc" />
            <YAxis stroke="#cccccc" />
            <Tooltip
              contentStyle={{ backgroundColor: "#252526", border: "1px solid #3e3e42" }}
              formatter={(value: any) => `$${Number(value).toFixed(2)}`}
            />
            <Legend />
            <Bar dataKey="deposit_amount" fill="#2da44e" name="Deposits" />
            <Bar dataKey="withdrawal_amount" fill="#cf222e" name="Withdrawals" />
            <Bar dataKey="net_amount" fill="#0969da" name="Net" />
          </BarChart>
        </ResponsiveContainer>
      );
    }
  }

  function renderDescriptionChart() {
    if (descriptionFilters.length === 0) {
      return (
        <div className="analytics-empty">
          Add description filters above to analyze transactions by keywords
        </div>
      );
    }

    if (descriptionData.length === 0) {
      return <div className="analytics-empty">No transactions match the description filters</div>;
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={descriptionData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3e3e42" />
          <XAxis dataKey="matched_substring" stroke="#cccccc" />
          <YAxis stroke="#cccccc" />
          <Tooltip
            contentStyle={{ backgroundColor: "#252526", border: "1px solid #3e3e42" }}
            formatter={(value: any, name?: string) => {
              if (name === "transaction_count") return Number(value);
              return `$${Number(value).toFixed(2)}`;
            }}
          />
          <Legend />
          <Bar dataKey="total_amount" fill="#0969da" name="Total Amount" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  function renderTagTimelineChart() {
    if (selectedTagId === null) {
      return (
        <div className="analytics-empty">
          Select a tag above to view its transactions over time
        </div>
      );
    }

    if (tagTimelineData.length === 0) {
      return <div className="analytics-empty">No transaction data for the selected tag</div>;
    }

    const selectedTag = availableTags.find((t) => t.id === selectedTagId);
    const tagColor = selectedTag?.color || "#0969da";

    if (chartType === "area") {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={tagTimelineData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3e3e42" />
            <XAxis dataKey="period" stroke="#cccccc" />
            <YAxis stroke="#cccccc" />
            <Tooltip
              contentStyle={{ backgroundColor: "#252526", border: "1px solid #3e3e42" }}
              formatter={(value: any) => `$${Number(value).toFixed(2)}`}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="deposit_amount"
              stackId="1"
              stroke="#2da44e"
              fill="#2da44e"
              name="Deposits"
            />
            <Area
              type="monotone"
              dataKey="withdrawal_amount"
              stackId="1"
              stroke="#cf222e"
              fill="#cf222e"
              name="Withdrawals"
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    } else if (chartType === "line") {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={tagTimelineData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3e3e42" />
            <XAxis dataKey="period" stroke="#cccccc" />
            <YAxis stroke="#cccccc" />
            <Tooltip
              contentStyle={{ backgroundColor: "#252526", border: "1px solid #3e3e42" }}
              formatter={(value: any) => `$${Number(value).toFixed(2)}`}
            />
            <Legend />
            <Line type="monotone" dataKey="total_amount" stroke={tagColor} name="Total" />
            <Line type="monotone" dataKey="net_amount" stroke="#0969da" name="Net" />
          </LineChart>
        </ResponsiveContainer>
      );
    } else {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={tagTimelineData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3e3e42" />
            <XAxis dataKey="period" stroke="#cccccc" />
            <YAxis stroke="#cccccc" />
            <Tooltip
              contentStyle={{ backgroundColor: "#252526", border: "1px solid #3e3e42" }}
              formatter={(value: any) => `$${Number(value).toFixed(2)}`}
            />
            <Legend />
            <Bar dataKey="deposit_amount" fill="#2da44e" name="Deposits" />
            <Bar dataKey="withdrawal_amount" fill="#cf222e" name="Withdrawals" />
            <Bar dataKey="net_amount" fill="#0969da" name="Net" />
          </BarChart>
        </ResponsiveContainer>
      );
    }
  }

  const stats = calculateSummaryStats();

  return (
    <div className="analytics-container compact">
      <div className="analytics-toolbar">
        <div className="analytics-view-tabs">
          <button
            className={`analytics-view-tab ${activeView === "tag" ? "active" : ""}`}
            onClick={() => setActiveView("tag")}
          >
            By Tag
          </button>
          <button
            className={`analytics-view-tab ${activeView === "type" ? "active" : ""}`}
            onClick={() => setActiveView("type")}
          >
            By Type
          </button>
          <button
            className={`analytics-view-tab ${activeView === "timeline" ? "active" : ""}`}
            onClick={() => setActiveView("timeline")}
          >
            Timeline
          </button>
          <button
            className={`analytics-view-tab ${activeView === "description" ? "active" : ""}`}
            onClick={() => setActiveView("description")}
          >
            By Description
          </button>
          <button
            className={`analytics-view-tab ${activeView === "tag-timeline" ? "active" : ""}`}
            onClick={() => setActiveView("tag-timeline")}
          >
            Tag Timeline
          </button>
        </div>

        <div className="analytics-toolbar-right">
          <div className="analytics-inline-filters">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              title="Start date"
            />
            <span className="analytics-date-separator">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              title="End date"
            />
            {(startDate || endDate) && (
              <button
                className="analytics-clear-dates"
                onClick={() => { setStartDate(""); setEndDate(""); }}
                title="Clear dates"
              >
                ×
              </button>
            )}
          </div>

          <div className="analytics-chart-type-selector">
            {activeView === "tag" && (
              <>
                <button className={chartType === "pie" ? "active" : ""} onClick={() => setChartType("pie")}>Pie</button>
                <button className={chartType === "bar" ? "active" : ""} onClick={() => setChartType("bar")}>Bar</button>
              </>
            )}
            {activeView === "timeline" && (
              <>
                <button className={chartType === "area" ? "active" : ""} onClick={() => setChartType("area")}>Area</button>
                <button className={chartType === "bar" ? "active" : ""} onClick={() => setChartType("bar")}>Bar</button>
              </>
            )}
            {activeView === "tag-timeline" && (
              <>
                <button className={chartType === "area" ? "active" : ""} onClick={() => setChartType("area")}>Area</button>
                <button className={chartType === "line" ? "active" : ""} onClick={() => setChartType("line")}>Line</button>
                <button className={chartType === "bar" ? "active" : ""} onClick={() => setChartType("bar")}>Bar</button>
              </>
            )}
          </div>
        </div>
      </div>

      {(activeView === "timeline" || activeView === "tag-timeline" || activeView === "description") && (
        <div className="analytics-secondary-filters">
          {(activeView === "timeline" || activeView === "tag-timeline") && (
            <div className="analytics-filter-group">
              <label>Granularity:</label>
              <select
                value={timeGranularity}
                onChange={(e) => setTimeGranularity(e.target.value as any)}
              >
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
              </select>
            </div>
          )}
          {activeView === "tag-timeline" && (
            <div className="analytics-filter-group">
              <label>Tag:</label>
              <select
                value={selectedTagId ?? ""}
                onChange={(e) => setSelectedTagId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Select a tag...</option>
                {availableTags.map((tag) => (
                  <option key={tag.id} value={tag.id}>{tag.name}</option>
                ))}
              </select>
            </div>
          )}
          {activeView === "description" && (
            <div className="analytics-filter-group" style={{ flexGrow: 1 }}>
              <div className="analytics-description-input">
                <input
                  type="text"
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddDescriptionFilter(); }}
                  placeholder="Keyword + Enter"
                />
                <button onClick={handleAddDescriptionFilter}>Add</button>
              </div>
              {descriptionFilters.length > 0 && (
                <div className="analytics-description-filters">
                  {descriptionFilters.map((filter) => (
                    <span key={filter} className="analytics-filter-tag">
                      {filter}
                      <button onClick={() => handleRemoveDescriptionFilter(filter)}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="analytics-summary-inline">
        <span><strong>{stats.totalTransactions}</strong> transactions</span>
        <span>Total: <strong>${stats.totalAmount.toFixed(2)}</strong></span>
        <span>Avg: <strong>${stats.avgAmount.toFixed(2)}</strong></span>
      </div>

      <div className="analytics-chart-area compact">{renderChart()}</div>

      <div className="analytics-transactions-section">
        <h3>Transactions ({filteredTransactions.length})</h3>
        <TransactionTable
          transactions={filteredTransactions}
          profileId={profileId}
          maxHeight={400}
        />
      </div>
    </div>
  );
}
