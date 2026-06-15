import React, { useMemo, useState } from 'react';
import './SearchableSelect.scss';

const SearchableSelect = ({ options, value, onChange, placeholder = 'Search name or ID' }) => {
    const [query, setQuery] = useState('');
    const filtered = useMemo(() => options.filter((option) => option.label.toLowerCase().includes(query.trim().toLowerCase())), [options, query]);
    return <div className="searchable-select">
        <input type="search" value={query} placeholder={placeholder} aria-label={placeholder} onChange={(event) => setQuery(event.target.value)} />
        <div className="searchable-results" role="listbox">
            {filtered.length === 0 && <div className="searchable-empty">No matches</div>}
            {filtered.map((option) => <button type="button" role="option" aria-selected={value === option.value} className={value === option.value ? 'selected' : ''} key={option.value} onClick={() => onChange(option.value)}>{option.label}</button>)}
        </div>
    </div>;
};
export default SearchableSelect;
