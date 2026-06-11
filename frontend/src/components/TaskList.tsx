import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { StudyTask, TaskStatus } from '../types/domain';

type TaskListProps = {
  readonly tasks: readonly StudyTask[];
  readonly onStatusChange: (taskId: string, status: TaskStatus) => void;
  readonly onRename: (taskId: string, title: string) => void;
  readonly onDelete: (taskId: string) => void;
};

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onStatusChange,
  onRename,
  onDelete
}) => {
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');

  const handleStartEdit = (task: StudyTask) => {
    setEditingTaskId(task.id);
    setEditText(task.title);
  };

  const handleSaveEdit = (taskId: string) => {
    if (editText.trim()) {
      onRename(taskId, editText.trim());
    }
    setEditingTaskId(null);
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
  };

  const cycleStatus = (currentStatus: TaskStatus): TaskStatus => {
    if (currentStatus === 'not_started') return 'in_progress';
    if (currentStatus === 'in_progress') return 'done';
    return 'not_started';
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'done':
        return <Feather name="check-circle" size={18} color="#10b981" />;
      case 'in_progress':
        return <Feather name="play-circle" size={18} color="#f59e0b" />;
      default:
        return <Feather name="circle" size={18} color="#cbd5e1" />;
    }
  };

  const getStatusStyle = (status: TaskStatus) => {
    switch (status) {
      case 'done':
        return styles.taskTitleDone;
      case 'in_progress':
        return styles.taskTitleInProgress;
      default:
        return styles.taskTitleNotStarted;
    }
  };

  const getStatusTextBadge = (status: TaskStatus) => {
    switch (status) {
      case 'done':
        return <View style={[styles.badge, styles.badgeDone]}><Text style={styles.badgeTextDone}>DONE</Text></View>;
      case 'in_progress':
        return <View style={[styles.badge, styles.badgeInProgress]}><Text style={styles.badgeTextInProgress}>IN PROGRESS</Text></View>;
      default:
        return <View style={[styles.badge, styles.badgeNotStarted]}><Text style={styles.badgeTextNotStarted}>TODO</Text></View>;
    }
  };

  if (tasks.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No tasks created yet for this chapter.</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {tasks.map((task) => {
        const isEditing = editingTaskId === task.id;

        return (
          <View key={task.id} style={styles.taskItem}>
            {/* Status Checkbox Button */}
            <TouchableOpacity
              style={styles.statusBtn}
              onPress={() => onStatusChange(task.id, cycleStatus(task.status))}
              disabled={isEditing}
              activeOpacity={0.7}
            >
              {getStatusIcon(task.status)}
            </TouchableOpacity>

            {/* Title / Renamer Input */}
            <View style={styles.titleContainer}>
              {isEditing ? (
                <View style={styles.editRow}>
                  <TextInput
                    style={styles.editInput}
                    value={editText}
                    onChangeText={setEditText}
                    onSubmitEditing={() => handleSaveEdit(task.id)}
                    autoFocus
                  />
                  <TouchableOpacity
                    style={styles.editActionBtn}
                    onPress={() => handleSaveEdit(task.id)}
                  >
                    <Feather name="check" size={16} color="#10b981" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.editActionBtn}
                    onPress={handleCancelEdit}
                  >
                    <Feather name="x" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.taskLabelRow}>
                  <Text style={[styles.taskTitle, getStatusStyle(task.status)]}>
                    {task.title}
                  </Text>
                  {getStatusTextBadge(task.status)}
                </View>
              )}
            </View>

            {/* Actions: Edit, Delete */}
            {!isEditing && (
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleStartEdit(task)}
                  activeOpacity={0.7}
                >
                  <Feather name="edit-2" size={14} color="#64748b" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.deleteBtn]}
                  onPress={() => onDelete(task.id)}
                  activeOpacity={0.7}
                >
                  <Feather name="trash-2" size={14} color="#ef4444" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  actionBtn: {
    padding: 6
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  badgeDone: {
    backgroundColor: '#d1fae5'
  },
  badgeInProgress: {
    backgroundColor: '#fef3c7'
  },
  badgeNotStarted: {
    backgroundColor: '#f1f5f9'
  },
  badgeTextDone: {
    color: '#065f46',
    fontSize: 9,
    fontWeight: '700'
  },
  badgeTextInProgress: {
    color: '#92400e',
    fontSize: 9,
    fontWeight: '700'
  },
  badgeTextNotStarted: {
    color: '#475569',
    fontSize: 9,
    fontWeight: '700'
  },
  deleteBtn: {
    marginLeft: 4
  },
  editActionBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 6
  },
  editInput: {
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    color: '#0f172a',
    flex: 1,
    fontSize: 14,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  editRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    width: '100%'
  },
  emptyContainer: {
    paddingVertical: 12
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 13,
    fontStyle: 'italic'
  },
  list: {
    width: '100%'
  },
  statusBtn: {
    padding: 4
  },
  taskItem: {
    alignItems: 'center',
    borderBottomColor: '#f1f5f9',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: 12
  },
  taskLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8
  },
  taskTitle: {
    color: '#334155',
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '500'
  },
  taskTitleDone: {
    color: '#94a3b8',
    textDecorationLine: 'line-through'
  },
  taskTitleInProgress: {
    color: '#b45309',
    fontWeight: '600'
  },
  taskTitleNotStarted: {},
  titleContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8
  }
});

export default TaskList;
