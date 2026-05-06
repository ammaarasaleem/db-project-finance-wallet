import React from "react";
import { cn } from "@/lib/utils";

interface StaggerListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  delayMs?: number;
}

export function StaggerList({ children, className, delayMs = 50, ...props }: StaggerListProps) {
  return (
    <div className={className} {...props}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;
        
        const existingClassName = child.props.className || "";
        const existingStyle = child.props.style || {};
        
        return React.cloneElement(child, {
          className: cn(existingClassName, "animate-stagger-in opacity-0"),
          style: { ...existingStyle, animationDelay: `${index * delayMs}ms`, animationFillMode: "forwards" },
        } as React.HTMLAttributes<HTMLElement>);
      })}
    </div>
  );
}
