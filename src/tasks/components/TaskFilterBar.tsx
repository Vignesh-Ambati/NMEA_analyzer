import React from 'react';
import { TaskCategory } from '../types';
import { getTaskCategories } from '../registry';

interface TaskFilterBarProps {
  currentCategory: TaskCategory | 'all';
  onSelectCategory: (category: TaskCategory | 'all') => void;
}

export const TaskFilterBar: React.FC<TaskFilterBarProps> = ({
  currentCategory,
  onSelectCategory,
}) => {
  const categories = getTaskCategories();

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
      {categories.map((cat) => {
        const isActive = currentCategory === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            type="button"
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              isActive
                ? 'bg-[#E05318] text-white shadow-xs'
                : 'bg-[#FAF8F5] dark:bg-slate-900 text-[#736E65] dark:text-slate-300 hover:text-[#24211D] dark:hover:text-white border border-[#E6E1D6] dark:border-slate-800 hover:bg-[#EFEAE1]'
            }`}
          >
            {cat.label}
          </button>
        );
      })}
    </div>
  );
};
