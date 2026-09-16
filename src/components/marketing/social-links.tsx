import { DiscordIcon, InstagramIcon, LinkedinIcon, XIcon, YoutubeIcon } from "@/components/icons/social";
import { contactConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

const icons = {
  instagram: { Icon: InstagramIcon, label: "Instagram" },
  linkedin: { Icon: LinkedinIcon, label: "LinkedIn" },
  youtube: { Icon: YoutubeIcon, label: "YouTube" },
  x: { Icon: XIcon, label: "X (Twitter)" },
  discord: { Icon: DiscordIcon, label: "Discord" },
} as const;

export function SocialLinks({ className }: { className?: string }) {
  const entries = (Object.keys(icons) as (keyof typeof icons)[]).filter((k) => contactConfig.socials[k]);
  if (entries.length === 0) return null;
  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {entries.map((key) => {
        const { Icon, label } = icons[key];
        return (
          <li key={key}>
            <a
              href={contactConfig.socials[key]}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="flex size-9 items-center justify-center rounded-full border bg-background text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <Icon className="size-4" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
