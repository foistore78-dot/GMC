
"use client";

import { useProjectStore } from "@/lib/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, Trash2, Calendar, FileJson } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

export default function ProjectsPage() {
  const { projects, isLoading, deleteProject } = useProjectStore();
  const [search, setSearch] = useState("");

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <div className="flex items-center justify-center h-64">Loading projects...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-headline font-bold">Your Canvases</h2>
          <p className="text-muted-foreground">Manage and explore all your imported datasets.</p>
        </div>
        <Link href="/import">
          <Button className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Canvas
          </Button>
        </Link>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Filter projects by name or description..." 
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredProjects.map((project) => (
          <div key={project.id} className="group relative">
            <Link href={`/projects/${project.id}`}>
              <Card className="overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all h-full">
                <div className="aspect-[2/1] relative overflow-hidden bg-muted">
                  <Image 
                    src={project.thumbnailUrl || "https://picsum.photos/seed/pc-def/600/400"} 
                    alt={project.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <span className="text-white text-sm font-medium">Open Canvas</span>
                  </div>
                </div>
                <CardHeader>
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="line-clamp-1 group-hover:text-primary transition-colors">{project.name}</CardTitle>
                    <Badge variant="secondary">{project.data?.length || 0} rows</Badge>
                  </div>
                  <CardDescription className="line-clamp-2 h-10">
                    {project.description || "No description provided for this canvas."}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="pt-0 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center">
                    <Calendar className="mr-1 h-3 w-3" />
                    {new Date(project.createdAt).toLocaleDateString()}
                  </div>
                  {project.schema && (
                    <div className="flex items-center text-accent-foreground font-medium">
                      <FileJson className="mr-1 h-3 w-3" />
                      AI Managed
                    </div>
                  )}
                </CardFooter>
              </Card>
            </Link>
            <Button 
              variant="destructive" 
              size="icon" 
              className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity z-10"
              onClick={(e) => {
                e.preventDefault();
                if(confirm("Delete this canvas?")) deleteProject(project.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {filteredProjects.length === 0 && (
          <div className="col-span-full py-20 text-center bg-muted/20 rounded-xl border-2 border-dashed border-muted">
            <p className="text-muted-foreground">No projects found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
