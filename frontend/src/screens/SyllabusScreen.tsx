import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TextInput
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { SQLiteDatabase } from 'expo-sqlite';
import { useSyllabus } from '../hooks/useSyllabus';
import { ProgressBar } from '../components/ProgressBar';
import { TaskList } from '../components/TaskList';
import type { TaskStatus } from '../types/domain';

type SyllabusScreenProps = {
  readonly database: SQLiteDatabase;
  readonly studentId: string;
  readonly deviceId: string;
};

export const SyllabusScreen: React.FC<SyllabusScreenProps> = ({
  database,
  studentId,
  deviceId
}) => {
  const {
    subjects,
    chapters,
    tasks,
    chapterProgress,
    subjectProgress,
    isLoading,
    createTask,
    changeTaskStatus,
    updateTask,
    deleteTask
  } = useSyllabus(database, studentId, deviceId);

  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);
  const [expandedChapterId, setExpandedChapterId] = useState<string | null>(null);
  const [newTaskTitleMap, setNewTaskTitleMap] = useState<Record<string, string>>({});
  const [addingTaskForChapterId, setAddingTaskForChapterId] = useState<string | null>(null);

  const toggleSubject = (subId: string) => {
    setExpandedSubjectId(expandedSubjectId === subId ? null : subId);
  };

  const toggleChapter = (chapId: string) => {
    setExpandedChapterId(expandedChapterId === chapId ? null : chapId);
  };

  const handleAddTask = async (chapterId: string) => {
    const title = newTaskTitleMap[chapterId]?.trim();
    if (!title) return;

    try {
      await createTask(chapterId, title);
      setNewTaskTitleMap((prev) => ({ ...prev, [chapterId]: '' }));
      setAddingTaskForChapterId(null);
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading curriculum syllabus...</Text>
      </View>
    );
  }

  // Stats rollups for header
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'done').length;
  const overallProgress = subjects.length > 0
    ? subjects.reduce((acc, sub) => acc + (subjectProgress[sub.id] ?? 0), 0) / subjects.length
    : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Progress Stats Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Overall Progress</Text>
            <Text style={styles.summaryValue}>{Math.round(overallProgress * 100)}%</Text>
            <ProgressBar progress={overallProgress} height={6} />
          </View>
          <View style={[styles.summaryCard, styles.summaryCardSide]}>
            <Text style={styles.summaryLabel}>Task Completion</Text>
            <Text style={styles.summaryValue}>
              {completedTasks}/{totalTasks}
            </Text>
            <Text style={styles.summarySubtext}>
              {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}% of all tasks done
            </Text>
          </View>
        </View>

        {/* Subjects Accordion */}
        <Text style={styles.sectionTitle}>Curriculum Subjects</Text>

        {subjects.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="book-open" size={32} color="#cbd5e1" />
            <Text style={styles.emptyText}>No subjects available.</Text>
          </View>
        ) : (
          subjects.map((subject) => {
            const isSubExpanded = expandedSubjectId === subject.id;
            const subChapters = chapters.filter((c) => c.subjectId === subject.id);
            const subProg = subjectProgress[subject.id] ?? 0;

            return (
              <View key={subject.id} style={styles.subjectCard}>
                {/* Subject Header */}
                <TouchableOpacity
                  style={styles.subjectHeader}
                  onPress={() => toggleSubject(subject.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.subjectInfo}>
                    <Text style={styles.subjectTitle}>{subject.title}</Text>
                    <Text style={styles.chapterCount}>
                      {subChapters.length} {subChapters.length === 1 ? 'Chapter' : 'Chapters'}
                    </Text>
                  </View>
                  <View style={styles.subjectProgressRow}>
                    <Text style={styles.progressPercent}>{Math.round(subProg * 100)}%</Text>
                    <Feather
                      name={isSubExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color="#64748b"
                      style={styles.chevron}
                    />
                  </View>
                </TouchableOpacity>

                <View style={styles.subProgressBarWrapper}>
                  <ProgressBar progress={subProg} height={4} />
                </View>

                {/* Chapters list under Subject */}
                {isSubExpanded && (
                  <View style={styles.chaptersList}>
                    {subChapters.length === 0 ? (
                      <Text style={styles.emptyDesc}>No chapters created for this subject.</Text>
                    ) : (
                      subChapters.map((chapter) => {
                        const isChapExpanded = expandedChapterId === chapter.id;
                        const chapTasks = tasks.filter((t) => t.chapterId === chapter.id);
                        const chapProg = chapterProgress[chapter.id] ?? 0;
                        const doneCount = chapTasks.filter((t) => t.status === 'done').length;

                        return (
                          <View key={chapter.id} style={styles.chapterItem}>
                            {/* Chapter Header */}
                            <TouchableOpacity
                              style={styles.chapterHeader}
                              onPress={() => toggleChapter(chapter.id)}
                              activeOpacity={0.8}
                            >
                              <View style={styles.chapterTitleCol}>
                                <Text style={styles.chapterTitle}>{chapter.title}</Text>
                                <Text style={styles.taskCount}>
                                  {doneCount}/{chapTasks.length} Done
                                </Text>
                              </View>
                              <View style={styles.chapterProgressCol}>
                                <Text style={styles.chapProgPercent}>
                                  {Math.round(chapProg * 100)}%
                                </Text>
                                <Feather
                                  name={isChapExpanded ? 'chevron-up' : 'chevron-down'}
                                  size={16}
                                  color="#94a3b8"
                                  style={styles.chevron}
                                />
                              </View>
                            </TouchableOpacity>

                            <View style={styles.chapBarWrapper}>
                              <ProgressBar progress={chapProg} height={3} />
                            </View>

                            {/* Tasks checklist under Chapter */}
                            {isChapExpanded && (
                              <View style={styles.tasksContainer}>
                                <TaskList
                                  tasks={chapTasks}
                                  onStatusChange={changeTaskStatus}
                                  onRename={(taskId, title) => updateTask(taskId, title, 'not_started')}
                                  onDelete={deleteTask}
                                />

                                {/* Inline Add Task Bar */}
                                {addingTaskForChapterId === chapter.id ? (
                                  <View style={styles.addTaskInputRow}>
                                    <TextInput
                                      style={styles.addTaskInput}
                                      placeholder="Enter task description..."
                                      value={newTaskTitleMap[chapter.id] ?? ''}
                                      onChangeText={(text) =>
                                        setNewTaskTitleMap((prev) => ({
                                          ...prev,
                                          [chapter.id]: text
                                        }))
                                      }
                                      onSubmitEditing={() => handleAddTask(chapter.id)}
                                      autoFocus
                                    />
                                    <TouchableOpacity
                                      style={styles.addTaskSaveBtn}
                                      onPress={() => handleAddTask(chapter.id)}
                                    >
                                      <Text style={styles.addTaskSaveBtnText}>Add</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                      style={styles.addTaskCancelBtn}
                                      onPress={() => setAddingTaskForChapterId(null)}
                                    >
                                      <Feather name="x" size={16} color="#ef4444" />
                                    </TouchableOpacity>
                                  </View>
                                ) : (
                                  <TouchableOpacity
                                    style={styles.addTaskToggle}
                                    onPress={() => setAddingTaskForChapterId(chapter.id)}
                                    activeOpacity={0.7}
                                  >
                                    <Feather name="plus-circle" size={14} color="#6366f1" style={styles.addIcon} />
                                    <Text style={styles.addTaskToggleText}>Add Task Offline</Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            )}
                          </View>
                        );
                      })
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  addIcon: {
    marginRight: 6
  },
  addTaskCancelBtn: {
    padding: 8
  },
  addTaskInput: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    color: '#0f172a',
    flex: 1,
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  addTaskInputRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12
  },
  addTaskSaveBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  addTaskSaveBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700'
  },
  addTaskToggle: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 12,
    paddingVertical: 6
  },
  addTaskToggleText: {
    color: '#6366f1',
    fontSize: 13,
    fontWeight: '600'
  },
  chapBarWrapper: {
    marginTop: 6
  },
  chapProgPercent: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700'
  },
  chapterCount: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2
  },
  chapterHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4
  },
  chapterItem: {
    borderBottomColor: '#f1f5f9',
    borderBottomWidth: 1,
    paddingVertical: 12
  },
  chapterProgressCol: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6
  },
  chapterTitle: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '700'
  },
  chapterTitleCol: {
    flex: 1
  },
  chaptersList: {
    backgroundColor: '#f8fafc',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderColor: '#f1f5f9',
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  chevron: {
    marginLeft: 4
  },
  emptyContainer: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 40
  },
  emptyDesc: {
    color: '#94a3b8',
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: 12
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center'
  },
  loadingText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12
  },
  progressPercent: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '700'
  },
  safeArea: {
    backgroundColor: '#f8fafc',
    flex: 1
  },
  scrollContent: {
    padding: 24
  },
  sectionTitle: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 16,
    textTransform: 'uppercase'
  },
  subProgressBarWrapper: {
    paddingHorizontal: 20,
    paddingTop: 4
  },
  subjectCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    elevation: 2,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8
  },
  subjectHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16
  },
  subjectInfo: {
    flex: 1
  },
  subjectProgressRow: {
    alignItems: 'center',
    flexDirection: 'row'
  },
  subjectTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800'
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    elevation: 3,
    flex: 1,
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10
  },
  summaryCardSide: {
    backgroundColor: '#ffffff'
  },
  summaryLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600'
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24
  },
  summarySubtext: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4
  },
  summaryValue: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
    marginTop: 4
  },
  taskCount: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1
  },
  tasksContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginTop: 8,
    padding: 12
  }
});

export default SyllabusScreen;
