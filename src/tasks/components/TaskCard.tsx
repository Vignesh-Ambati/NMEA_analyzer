import React from 'react';
import { ChevronRight } from 'lucide-react';
import { TaskDefinition } from '../types';

interface TaskCardProps {
  task: TaskDefinition;
  isSelected?: boolean;
  onSelect: (taskId: number) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  isSelected = false,
  onSelect,
}) => {
  return (
    <div
      onClick={() => onSelect(task.id)}
      className={`rounded-2xl p-4 sm:p-5 transition-all cursor-pointer border flex flex-col justify-between group shadow-xs hover:shadow-md ${
        isSelected
          ? 'bg-[#FDF3EE] dark:bg-orange-950/30 border-[#E05318]'
          : 'bg-[#FAF8F5] dark:bg-slate-900 border-[#E6E1D6] dark:border-slate-800 hover:border-[#E05318]'
      }`}
    >
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1.5">
            <span className="font-mono text-xs font-bold text-[#E05318] bg-orange-100/70 dark:bg-orange-950/50 px-2 py-0.5 rounded-md">
              Task {task.id + 1}
            </span>
            {task.category && (
              <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                {task.category}
              </span>
            )}
          </div>
          <span className="text-[11px] text-[#736E65] dark:text-slate-400 font-mono">
            {task.yAxisLabel}
          </span>
        </div>

        <h3 className="text-sm font-bold text-[#24211D] dark:text-slate-100 group-hover:text-[#E05318] transition-colors leading-snug">
          {task.title}
        </h3>

        <p className="text-xs text-[#736E65] dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-[#E6E1D6] dark:border-slate-800 flex items-center justify-between text-xs">
        <span className="text-[#736E65] dark:text-slate-400 font-mono text-[11px]">
          Unit: <strong>{task.unit || 'dimensionless'}</strong>
        </span>
        <span className="font-semibold text-[#E05318] flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
          <span>View Chart</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
};
