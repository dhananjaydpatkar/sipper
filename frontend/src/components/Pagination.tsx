import React from 'react';

interface PaginationProps {
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ page, total, limit, onPageChange }) => {
  const totalPages = Math.ceil(total / limit) || 1;

  if (totalPages <= 1) return null;

  return (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'center', marginTop: '1rem' }}>
      <button 
        className="btn btn-secondary" 
        disabled={page <= 1} 
        onClick={() => onPageChange(page - 1)}
        style={{ padding: '0.25rem 0.75rem' }}
      >
        Previous
      </button>
      <span>Page {page} of {totalPages}</span>
      <button 
        className="btn btn-secondary" 
        disabled={page >= totalPages} 
        onClick={() => onPageChange(page + 1)}
        style={{ padding: '0.25rem 0.75rem' }}
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;
