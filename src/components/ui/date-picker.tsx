"use client"

import * as React from "react"
import { format } from "date-fns"
import { it } from 'date-fns/locale'
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  value: string | Date | undefined;
  onChange: (date: Date | undefined) => void;
  disabled?: boolean;
}

export function DatePicker({ value, onChange, disabled }: DatePickerProps) {
    const [date, setDate] = React.useState<Date | undefined>(value ? new Date(value) : undefined);

    React.useEffect(() => {
        setDate(value ? new Date(value) : undefined);
    }, [value]);

    const handleSelect = (selectedDate: Date | undefined) => {
        setDate(selectedDate);
        onChange(selectedDate);
    }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP", { locale: it }) : <span>Seleziona una data</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          initialFocus
          locale={it}
        />
      </PopoverContent>
    </Popover>
  )
}
