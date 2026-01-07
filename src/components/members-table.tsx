"use client";

import { useState } from "react";
import type { Member } from "@/lib/members-data";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, MoreHorizontal, Pencil, Trash2, X, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "./ui/input";

type MembersTableProps = {
  initialMembers: Member[];
};

export function MembersTable({ initialMembers }: MembersTableProps) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [filter, setFilter] = useState('');
  const { toast } = useToast();

  const handleStatusChange = (id: string, status: Member["status"]) => {
    setMembers((prevMembers) =>
      prevMembers.map((member) =>
        member.id === id ? { ...member, status } : member
      )
    );
    toast({
      title: "Member status updated!",
      description: `Member has been set to ${status}.`,
    });
  };

  const handleDelete = (id: string) => {
    setMembers((prevMembers) => prevMembers.filter((member) => member.id !== id));
    toast({
      title: "Member removed",
      description: "The member has been removed from the list.",
      variant: "destructive",
    });
  };
  
  const filteredMembers = members.filter(member => 
    member.name.toLowerCase().includes(filter.toLowerCase()) ||
    member.email.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div>
        <div className="flex items-center py-4">
            <div className="relative w-full max-w-sm">
                 <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Filter by name or email..."
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                    className="pl-10"
                />
            </div>
        </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Instruments</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMembers.length > 0 ? (
              filteredMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    <div>{member.email}</div>
                    <div>{member.phone}</div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        member.status === "approved"
                          ? "default"
                          : member.status === "pending"
                          ? "secondary"
                          : "destructive"
                      }
                      className={cn({
                        "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30": member.status === "approved",
                        "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30": member.status === "pending",
                        "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30": member.status === "rejected",
                        "text-primary-foreground": member.status === 'approved'
                      })}
                    >
                      {member.status}
                    </Badge>
                  </TableCell>
                   <TableCell className="hidden lg:table-cell text-muted-foreground">{member.instruments}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(member.id, "approved")}
                          disabled={member.status === 'approved'}
                        >
                          <Check className="mr-2 h-4 w-4" /> Approve
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(member.id, "rejected")}
                          disabled={member.status === 'rejected'}
                        >
                          <X className="mr-2 h-4 w-4" /> Reject
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => toast({title: "Edit action is a work in progress."})}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-500 focus:text-red-400 focus:bg-red-500/10">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently remove {member.name} from the list.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(member.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                    No members found.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
