import { cn } from "@/lib/utils";
import { Avatar, type AvatarSize } from "@/modules/blog/components/avatar";
import { personName, type RoomPerson } from "@/modules/rooms/api/rooms";

export function RoomFaces({
  people,
  limit = 4,
  size = "xs",
  className,
}: {
  people: RoomPerson[];
  limit?: number;
  size?: AvatarSize;
  className?: string;
}) {
  const shown = people.slice(0, limit);
  if (shown.length === 0) return null;
  return (
    <span aria-hidden data-room-faces className={cn("flex shrink-0", className)}>
      {shown.map((person, i) => (
        <span
          key={person.id}
          className={cn(
            "rounded-full ring-2 ring-white dark:ring-slate-950",
            i > 0 && (size === "xs" ? "-ml-1.5" : "-ml-2.5"),
          )}
        >
          <Avatar src={person.avatarUrl} name={personName(person)} seed={person.id} size={size} />
        </span>
      ))}
    </span>
  );
}
