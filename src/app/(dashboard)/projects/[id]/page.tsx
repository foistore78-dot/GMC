
"use client";

import { useParams, useRouter } from "next/navigation";
import { useProjectStore } from "@/lib/store";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  LayoutGrid, 
  List, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  MoreHorizontal,
  Edit,
  Sparkles,
  Database
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { projects, deleteProject, addRecord, updateRecord, deleteRecord } = useProjectStore();
  
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"table" | "grid">("table");
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [newRecord, setNewRecord] = useState<Record<string, string>>({});

  const project = projects.find(p => p.id === id);

  const filteredData = useMemo(() => {
    if (!project) return [];
    return project.data.filter(record => 
      Object.values(record).some(val => 
        String(val).toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [project, search]);

  const headers = useMemo(() => {
    if (!project || project.data.length === 0) return [];
    // Extract all unique keys except internal _id
    const keys = new Set<string>();
    project.data.forEach(r => Object.keys(r).forEach(k => {
      if (k !== '_id') keys.add(k);
    }));
    return Array.from(keys);
  }, [project]);

  if (!project) return <div className="p-8 text-center">Project not found.</div>;

  const handleAdd = () => {
    addRecord(project.id, newRecord);
    setIsAddingRecord(false);
    setNewRecord({});
  };

  const handleDeleteProject = () => {
    if (confirm("Are you sure you want to delete this entire project?")) {
      deleteProject(project.id);
      router.push("/dashboard");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-headline font-bold">{project.name}</h2>
            <p className="text-sm text-muted-foreground">{project.description || "No description provided."}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isAddingRecord} onOpenChange={setIsAddingRecord}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" /> Add Record
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Record</DialogTitle>
                <DialogDescription>
                  Enter the details for your new record based on current fields.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[60vh] overflow-auto">
                {headers.map(h => (
                  <div key={h} className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor={h} className="text-right capitalize">
                      {h}
                    </Label>
                    <Input 
                      id={h} 
                      className="col-span-3" 
                      onChange={(e) => setNewRecord({...newRecord, [h]: e.target.value})}
                    />
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleAdd}>Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDeleteProject} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-3 rounded-lg border shadow-sm">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search project data..." 
                className="pl-9 bg-muted/20 border-none focus-visible:ring-1"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center bg-muted rounded-md p-1 self-end sm:self-auto">
              <Button 
                variant={view === "table" ? "secondary" : "ghost"} 
                size="sm" 
                className="h-8 px-3"
                onClick={() => setView("table")}
              >
                <List className="h-4 w-4 mr-2" /> Table
              </Button>
              <Button 
                variant={view === "grid" ? "secondary" : "ghost"} 
                size="sm" 
                className="h-8 px-3"
                onClick={() => setView("grid")}
              >
                <LayoutGrid className="h-4 w-4 mr-2" /> Cards
              </Button>
            </div>
          </div>

          <Card className="min-h-[400px]">
            {project.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-20 text-muted-foreground">
                <Database className="h-12 w-12 mb-4 opacity-10" />
                <p>This project has no data records yet.</p>
                <p className="text-xs">Click "Add Record" to start manually.</p>
              </div>
            ) : view === "table" ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    {headers.map(h => (
                      <TableHead key={h} className="capitalize font-semibold">{h}</TableHead>
                    ))}
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((record, idx) => (
                    <TableRow key={record._id || idx}>
                      {headers.map(h => (
                        <TableCell key={h}>{record[h]}</TableCell>
                      ))}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => deleteRecord(project.id, record._id)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                {filteredData.map((record, idx) => (
                  <Card key={record._id || idx} className="shadow-none border hover:border-primary transition-colors">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm font-medium">Record #{idx + 1}</CardTitle>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteRecord(project.id, record._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      {headers.slice(0, 5).map(h => (
                        <div key={h} className="flex justify-between">
                          <span className="text-muted-foreground font-medium mr-2 capitalize">{h}:</span>
                          <span className="truncate max-w-[150px]">{record[h]}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="h-4 w-4" />
                <CardTitle className="text-sm font-semibold uppercase tracking-wider">AI Schema Summary</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.schema ? (
                <>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase">Key Entities</p>
                    <div className="flex flex-wrap gap-1">
                      {project.schema.entities.map(e => (
                        <Badge key={e} variant="outline" className="text-[10px] py-0 bg-white">
                          {e}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase">Logic</p>
                    <p className="text-xs leading-relaxed">{project.schema.explanation}</p>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No AI schema analysis available. Import data using the AI assistant to see insights here.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Canvas Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Total Rows</span>
                <span className="font-bold">{project.data.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Total Columns</span>
                <span className="font-bold">{headers.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Created</span>
                <span>{new Date(project.createdAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
