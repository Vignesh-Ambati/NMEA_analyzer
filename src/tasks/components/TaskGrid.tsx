import React from 'react';
import { TaskDefinition } from '../types';
import { TaskCard } from './TaskCard';

interface TaskGridProps {
  tasks: TaskDefinition[];
  selectedTaskId: number;
  onSelectTask: (taskId: number) => void;
}

export const TaskGrid: React.FC<TaskGridProps> = ({
  tasks,
  selectedTaskId,
  onSelectTask,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          isSelected={task.id === selectedTaskId}
          onSelect={onSelectTask}
        />
      ))}
    </div>
  );
};
