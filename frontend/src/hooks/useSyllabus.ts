import { useEffect, useState, useRef, useCallback } from 'react';
import type { SQLiteDatabase } from 'expo-sqlite';
import { SyllabusService } from '../services/syllabusService';
import { LocalCurriculumRepository } from '../storage/repositories/curriculumRepository';
import type { Subject, Chapter, StudyTask, TaskStatus } from '../types/domain';

export type ChapterProgressMap = Record<string, number>; // chapterId -> percentage (0 to 1)
export type SubjectProgressMap = Record<string, number>; // subjectId -> percentage (0 to 1)

export type UseSyllabusResult = {
  readonly subjects: readonly Subject[];
  readonly chapters: readonly Chapter[];
  readonly tasks: readonly StudyTask[];
  readonly chapterProgress: ChapterProgressMap;
  readonly subjectProgress: SubjectProgressMap;
  readonly isLoading: boolean;
  readonly createTask: (chapterId: string, title: string) => Promise<void>;
  readonly changeTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  readonly updateTask: (taskId: string, title: string, status: TaskStatus) => Promise<void>;
  readonly deleteTask: (taskId: string) => Promise<void>;
  readonly reloadData: () => Promise<void>;
};

export function useSyllabus(
  database: SQLiteDatabase,
  studentId: string,
  deviceId: string
): UseSyllabusResult {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [chapterProgress, setChapterProgress] = useState<ChapterProgressMap>({});
  const [subjectProgress, setSubjectProgress] = useState<SubjectProgressMap>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const serviceRef = useRef<SyllabusService | null>(null);
  const repoRef = useRef<LocalCurriculumRepository | null>(null);

  if (!serviceRef.current) {
    serviceRef.current = new SyllabusService(database);
  }
  if (!repoRef.current) {
    repoRef.current = new LocalCurriculumRepository(database);
  }

  const syllabusService = serviceRef.current;
  const curriculumRepo = repoRef.current;

  // Calculate progress maps
  const recalculateProgress = useCallback((
    currentSubjects: readonly Subject[],
    currentChapters: readonly Chapter[],
    currentTasks: readonly StudyTask[]
  ) => {
    // 1. Calculate Chapter Progress
    const chapProgress: ChapterProgressMap = {};
    for (const chap of currentChapters) {
      const chapTasks = currentTasks.filter((t) => t.chapterId === chap.id);
      const total = chapTasks.length;
      if (total === 0) {
        chapProgress[chap.id] = 0;
      } else {
        const completed = chapTasks.filter((t) => t.status === 'done').length;
        chapProgress[chap.id] = completed / total;
      }
    }

    // 2. Calculate Subject Progress (average of chapter progress percentages)
    const subProgress: SubjectProgressMap = {};
    for (const sub of currentSubjects) {
      const subChapters = currentChapters.filter((c) => c.subjectId === sub.id);
      const totalChapters = subChapters.length;
      if (totalChapters === 0) {
        subProgress[sub.id] = 0;
      } else {
        const sumProg = subChapters.reduce((acc, c) => acc + (chapProgress[c.id] ?? 0), 0);
        subProgress[sub.id] = sumProg / totalChapters;
      }
    }

    setChapterProgress(chapProgress);
    setSubjectProgress(subProgress);
  }, []);

  // Fetch data from SQLite
  const reloadData = useCallback(async () => {
    try {
      await syllabusService.ensureSeededData(studentId);
      const [subs, chaps, tsks] = await Promise.all([
        curriculumRepo.listSubjects(studentId),
        curriculumRepo.listChapters(studentId),
        curriculumRepo.listTasks(studentId)
      ]);

      setSubjects(subs);
      setChapters(chaps);
      setTasks(tsks);

      recalculateProgress(subs, chaps, tsks);
    } catch (err) {
      console.error('Failed to load syllabus data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [studentId, curriculumRepo, syllabusService, recalculateProgress]);

  // Initial load
  useEffect(() => {
    reloadData();
  }, [reloadData]);

  const createTask = async (chapterId: string, title: string) => {
    await syllabusService.createTask({
      chapterId,
      deviceId,
      studentId,
      title
    });
    await reloadData();
  };

  const changeTaskStatus = async (taskId: string, status: TaskStatus) => {
    await syllabusService.changeTaskStatus({
      deviceId,
      status,
      studentId,
      taskId
    });
    await reloadData();
  };

  const updateTask = async (taskId: string, title: string, status: TaskStatus) => {
    await syllabusService.updateTask({
      deviceId,
      status,
      studentId,
      taskId,
      title
    });
    await reloadData();
  };

  const deleteTask = async (taskId: string) => {
    await syllabusService.deleteTask({
      deviceId,
      studentId,
      taskId
    });
    await reloadData();
  };

  return {
    chapterProgress,
    chapters,
    createTask,
    changeTaskStatus,
    deleteTask,
    isLoading,
    reloadData,
    subjectProgress,
    subjects,
    tasks,
    updateTask
  };
}
