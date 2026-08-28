import type { ReactNode } from "react";
import { Icon } from "./icon";

interface EmptyProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function Empty({ icon = "sparkles", title, description, action }: EmptyProps) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name={icon} size={26} />
      </span>
      <span className="empty-title">{title}</span>
      {description ? <span className="empty-desc">{description}</span> : null}
      {action}
    </div>
  );
}
