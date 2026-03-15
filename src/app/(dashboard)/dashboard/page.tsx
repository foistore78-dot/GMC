"use client";

import { useProjectStore } from "@/lib/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, FileText, Database, Activity, ArrowRight, FolderKanban } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

export default function DashboardPage() {
  const { projects, isLoading } = useProjectStore();

  if (isLoading) return <div className="flex items-center justify-center h-full">Loading your workspace...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-headline font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Welcome back. Here is what is happening with your projects.</p>
        </div>
        <Link href="/import">
          <Button className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
            <p className="text-xs text-muted-foreground">Active work canvases</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Points</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projects.reduce((acc, p) => acc + (p.data?.length || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Imported records</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Insights</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projects.filter(p => p.schema).length}
            </div>
            <p className="text-xs text-muted-foreground">Schema suggestions active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Just now</div>
            <p className="text-xs text-muted-foreground">Your last login</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-headline font-semibold">Recent Projects</h3>
          <Link href="/projects" className="text-sm text-primary hover:underline flex items-center">
            View all <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.slice(0, 3).map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all group h-full">
                <div className="aspect-video relative overflow-hidden bg-muted">
                  <Image 
                    src={project.thumbnailUrl || "https://picsum.photos/seed/pc-def/600/400"} 
                    alt={project.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="backdrop-blur bg-white/50 border-none">
                      {project.data?.length || 0} items
                    </Badge>
                  </div>
                </div>
                <CardHeader>
                  <CardTitle className="line-clamp-1">{project.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {project.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Activity className="mr-1 h-3 w-3" />
                    Last updated: {new Date(project.createdAt).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {projects.length === 0 && (
            <Card className="border-dashed flex flex-col items-center justify-center p-12 text-center col-span-full">
              <PlusCircle className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
              <CardTitle className="text-muted-foreground">No projects yet</CardTitle>
              <CardDescription className="mb-4">Create a new project or import some data to get started.</CardDescription>
              <Link href="/import">
                <Button variant="outline">Create My First Canvas</Button>
              </Link>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}