import React from 'react';

interface DateFilterProps {
  onFilterChange: (startDate: string | undefined, endDate: string | undefined) => void;
}

const DateFilter: React.FC<DateFilterProps> = ({ onFilterChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const today = new Date();
    today.setUTCHours(23, 59, 59, 999);
    
    let start: Date | undefined;
    let end: Date | undefined;
    
    if (value === 'past_30') {
      start = new Date(today);
      start.setDate(today.getDate() - 30);
    } else if (value === 'current_month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (value === 'last_month') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0); // Last day of last month
      end.setUTCHours(23, 59, 59, 999);
    } else if (value === 'last_3_months') {
      start = new Date(today);
      start.setMonth(today.getMonth() - 3);
    } else if (value === 'last_6_months') {
      start = new Date(today);
      start.setMonth(today.getMonth() - 6);
    }

    if (value === 'all') {
      onFilterChange(undefined, undefined);
    } else {
      onFilterChange(start?.toISOString(), end?.toISOString());
    }
  };

  return (
    <div className="input-group" style={{ maxWidth: '300px' }}>
      <label>Date Range</label>
      <select className="input-control" defaultValue="past_30" onChange={handleChange}>
        <option value="past_30">Past 30 Days</option>
        <option value="current_month">Current Month</option>
        <option value="last_month">Last Month</option>
        <option value="last_3_months">Last 3 Months</option>
        <option value="last_6_months">Last 6 Months</option>
        <option value="all">All Time</option>
      </select>
    </div>
  );
};

export default DateFilter;
