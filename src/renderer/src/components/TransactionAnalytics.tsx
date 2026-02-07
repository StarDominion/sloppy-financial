import { useEffect, useState } from "react";
import { onDataChange } from "../dataEvents";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area,
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

type ViewType = "tag" | "type" | "timeline" | "description";
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

  // Data state
  const [tagData, setTagData] = useState<any[]>([]);
  const [typeData, setTypeData] = useState<any[]>([]);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [descriptionData, setDescriptionData] = useState<any[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data based on active view
  useEffect(() => {
    loadData();
    return onDataChange("transactions", loadData);
  }, [profileId, activeView, startDate, endDate, timeGranularity, descriptionFilters]); // eslint-disable-line react-hooks/exhaustive-deps

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
      }
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
    }
  }

  function renderTagChart() {
    if (tagData.length === 0) {
      return <div className="analytics-empty">No transaction data available</div>;
    }

    if (chartType === "pie") {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={tagData}
              dataKey="total_amount"
              nameKey="tag_name"
              cx="50%"
              cy="50%"
              outerRadius={120}
              label={(entry) => `${entry.tag_name}: $${Number(entry.total_amount).toFixed(2)}`}
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
        <ResponsiveContainer width="100%" height={400}>
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
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={typeData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3e3e42" />
          <XAxis dataKey="type" stroke="#cccccc" />
          <YAxis stroke="#cccccc" />
          <Tooltip
            contentStyle={{ backgroundColor: "#252526", border: "1px solid #3e3e42" }}
            formatter={(value: any, name: string) => {
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
        <ResponsiveContainer width="100%" height={400}>
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
        <ResponsiveContainer width="100%" height={400}>
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
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={descriptionData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3e3e42" />
          <XAxis dataKey="matched_substring" stroke="#cccccc" />
          <YAxis stroke="#cccccc" />
          <Tooltip
            contentStyle={{ backgroundColor: "#252526", border: "1px solid #3e3e42" }}
            formatter={(value: any, name: string) => {
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

  const stats = calculateSummaryStats();

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h2>Transaction Analytics</h2>
      </div>

      <div className="analytics-filters">
        <div className="analytics-filter-row">
          <div className="analytics-filter-group">
            <label>Start Date:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="analytics-filter-group">
            <label>End Date:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          {startDate || endDate ? (
            <button
              className="analytics-clear-dates"
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
            >
              Clear Dates
            </button>
          ) : null}
        </div>

        {activeView === "timeline" && (
          <div className="analytics-filter-row">
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
          </div>
        )}

        {activeView === "description" && (
          <div className="analytics-filter-row">
            <div className="analytics-filter-group" style={{ flexGrow: 1 }}>
              <label>Description Keywords:</label>
              <div className="analytics-description-input">
                <input
                  type="text"
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddDescriptionFilter();
                    }
                  }}
                  placeholder="Enter keyword and press Enter"
                />
                <button onClick={handleAddDescriptionFilter}>Add</button>
              </div>
              <div className="analytics-description-filters">
                {descriptionFilters.map((filter) => (
                  <span key={filter} className="analytics-filter-tag">
                    {filter}
                    <button onClick={() => handleRemoveDescriptionFilter(filter)}>×</button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

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
      </div>

      <div className="analytics-chart-controls">
        <div className="analytics-chart-type-selector">
          <label>Chart Type:</label>
          {activeView === "tag" && (
            <>
              <button
                className={chartType === "pie" ? "active" : ""}
                onClick={() => setChartType("pie")}
              >
                Pie
              </button>
              <button
                className={chartType === "bar" ? "active" : ""}
                onClick={() => setChartType("bar")}
              >
                Bar
              </button>
            </>
          )}
          {activeView === "timeline" && (
            <>
              <button
                className={chartType === "area" ? "active" : ""}
                onClick={() => setChartType("area")}
              >
                Area
              </button>
              <button
                className={chartType === "bar" ? "active" : ""}
                onClick={() => setChartType("bar")}
              >
                Bar
              </button>
            </>
          )}
        </div>
      </div>

      <div className="analytics-chart-area">{renderChart()}</div>

      <div className="analytics-summary">
        <div className="analytics-stat-card">
          <div className="analytics-stat-label">Total Transactions</div>
          <div className="analytics-stat-value">{stats.totalTransactions}</div>
        </div>
        <div className="analytics-stat-card">
          <div className="analytics-stat-label">Total Amount</div>
          <div className="analytics-stat-value">${stats.totalAmount.toFixed(2)}</div>
        </div>
        <div className="analytics-stat-card">
          <div className="analytics-stat-label">Average Amount</div>
          <div className="analytics-stat-value">${stats.avgAmount.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}
