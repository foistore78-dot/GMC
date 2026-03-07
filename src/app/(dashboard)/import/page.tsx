
"use client";

import { useState } from "react";
import { useProjectStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { suggestDataSchema, type AIDataSchemaSuggestionOutput } from "@/ai/flows/ai-data-schema-suggestion-flow";
import { 
  Import, 
  Sparkles, 
  Check, 
  Loader2, 
  AlertCircle,
  FileJson,
  Table as TableIcon
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ImportPage() {
  const router = useRouter();
  const { addProject, updateProject } = useProjectStore();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rawData, setRawData] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIDataSchemaSuggestionOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!rawData.trim()) {
      setError("Please paste some data to analyze.");
      return;
    }
    setError(null);
    setIsAnalyzing(true);
    try {
      const result = await suggestDataSchema({ rawData });
      setAnalysisResult(result);
    } catch (err) {
      console.error(err);
      setError("AI analysis failed. Please ensure your data is readable.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImport = () => {
    if (!name || !rawData) {
      setError("Name and data are required.");
      return;
    }

    try {
      let parsedData: any[] = [];
      // Basic JSON attempt
      if (rawData.trim().startsWith('[') || rawData.trim().startsWith('{')) {
        const parsed = JSON.parse(rawData);
        parsedData = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        // Simple CSV parsing mock
        const lines = rawData.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        parsedData = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          const obj: any = {};
          headers.forEach((h, i) => obj[h] = values[i]);
          return obj;
        });
      }

      const project = addProject({
        name,
        description,
        thumbnailUrl: `https://picsum.photos/seed/${Math.random()}/600/400`,
      });

      updateProject(project.id, {
        data: parsedData,
        schema: analysisResult ? {
          entities: analysisResult.keyEntities,
          structure: analysisResult.suggestedSchema,
          explanation: analysisResult.explanation
        } : undefined
      });

      router.push(`/projects/${project.id}`);
    } catch (err) {
      console.error(err);
      setError("Import failed. Check your data format (CSV or JSON required).");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-1">
        <h2 className="text-3xl font-headline font-bold">Import Data</h2>
        <p className="text-muted-foreground">Bring your existing project data into a new Canvas.</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>1. Project Details</CardTitle>
            <CardDescription>Give your new Canvas a name and purpose.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input 
                id="name" 
                placeholder="e.g., Q3 Sales Report" 
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description (Optional)</Label>
              <Textarea 
                id="desc" 
                placeholder="What is this project about?" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Paste Your Data</CardTitle>
            <CardDescription>Supported formats: CSV, JSON.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 mb-2">
              <Button variant="outline" size="sm" onClick={() => setRawData(`id, name, value\n1, Example A, 100\n2, Example B, 200`)}>
                <TableIcon className="mr-2 h-3 w-3" />
                Sample CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => setRawData(`[\n  {"id": 1, "name": "Example A", "value": 100},\n  {"id": 2, "name": "Example B", "value": 200}\n]`)}>
                <FileJson className="mr-2 h-3 w-3" />
                Sample JSON
              </Button>
            </div>
            <Textarea 
              className="min-h-[200px] font-mono text-xs" 
              placeholder="Paste your CSV or JSON here..." 
              value={rawData}
              onChange={(e) => setRawData(e.target.value)}
            />
          </CardContent>
          <CardFooter className="flex justify-between border-t p-6 bg-muted/20">
            <Button 
              variant="secondary" 
              onClick={handleAnalyze} 
              disabled={isAnalyzing || !rawData}
              className="hover:bg-accent/20"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4 text-accent" />
                  AI Analyze Structure
                </>
              )}
            </Button>
            <Button onClick={handleImport} className="bg-primary text-primary-foreground font-semibold">
              <Import className="mr-2 h-4 w-4" />
              Import to Canvas
            </Button>
          </CardFooter>
        </Card>

        {analysisResult && (
          <Card className="border-accent/50 bg-accent/5 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <CardHeader className="bg-accent/10 border-b">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                <CardTitle>AI Insights & Suggested Schema</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Entities Identified</h4>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.keyEntities.map((ent, idx) => (
                    <Badge key={idx} variant="outline" className="bg-white px-2 py-1">
                      {ent}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Structure Explanation</h4>
                <p className="text-sm leading-relaxed">{analysisResult.explanation}</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Recommended Schema</h4>
                <div className="bg-white border rounded-md p-4 font-mono text-xs max-h-40 overflow-auto">
                  {analysisResult.suggestedSchema}
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-accent/10 p-4 flex items-center gap-2 text-xs text-accent-foreground font-medium">
              <Check className="h-4 w-4" />
              These insights will be saved with your project for better data visualization.
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
