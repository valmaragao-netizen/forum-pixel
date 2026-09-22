import Image from "next/image";

type UserAvatarProps = {
  avatarUrl: string;
  initials: string;
  className?: string;
  sizes?: string;
};

export function UserAvatar({
  avatarUrl,
  initials,
  className = "",
  sizes = "42px",
}: UserAvatarProps) {
  return (
    <span
      className={`user-avatar ${avatarUrl ? "has-image" : ""} ${className}`.trim()}
      aria-hidden="true"
    >
      {avatarUrl ? (
        <Image src={avatarUrl} alt="" fill unoptimized sizes={sizes} />
      ) : (
        initials
      )}
    </span>
  );
}
