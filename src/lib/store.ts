
"use client";

import { useState, useEffect } from 'react';
import { Project } from './types';

const STORAGE_KEY = 'project-canvas-data';

export function useProjectStore() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setProjects(JSON.parse(saved));
    } else {
      // Default empty state or welcome project
      const initial: Project[] = [
        {
          id: 'welcome-1',
          name: 'Welcome Project',
          description: 'Get started by importing your first dataset.',
          createdAt: new Date().toISOString(),
          thumbnailUrl: 'https://picsum.photos/seed/pc1/600/400',
          data: [],
        }
      ];
      setProjects(initial);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    }
    setIsLoading(false);
  }, []);

  const saveProjects = (newProjects: Project[]) => {
    setProjects(newProjects);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newProjects));
  };

  const addProject = (project: Omit<Project, 'id' | 'createdAt' | 'data'>) => {
    const newProject: Project = {
      ...project,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      data: [],
    };
    saveProjects([...projects, newProject]);
    return newProject;
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    const newProjects = projects.map(p => p.id === id ? { ...p, ...updates } : p);
    saveProjects(newProjects);
  };

  const deleteProject = (id: string) => {
    saveProjects(projects.filter(p => p.id !== id));
  };

  const addRecord = (projectId: string, record: Record<string, any>) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const newRecord = { ...record, _id: Math.random().toString(36).substr(2, 9) };
    updateProject(projectId, { data: [...project.data, newRecord] });
  };

  const updateRecord = (projectId: string, recordId: string, updates: Record<string, any>) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const newData = project.data.map(r => r._id === recordId ? { ...r, ...updates } : r);
    updateProject(projectId, { data: newData });
  };

  const deleteRecord = (projectId: string, recordId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    updateProject(projectId, { data: project.data.filter(r => r._id !== recordId) });
  };

  return {
    projects,
    isLoading,
    addProject,
    updateProject,
    deleteProject,
    addRecord,
    updateRecord,
    deleteRecord
  };
}
