import { MemberProfile } from "../types";

interface MemberAvatarProps {
  member: Pick<MemberProfile, "nome" | "foto" | "fotoUrl" | "cor">;
  size?: "small" | "large" | "xl";
}

export function MemberAvatar({ member, size = "large" }: MemberAvatarProps) {
  const classes = ["avatar-chip", size, member.fotoUrl ? "has-photo" : ""].filter(Boolean).join(" ");

  return (
    <span className={classes} style={{ background: member.cor }}>
      {member.fotoUrl ? <img alt={member.nome} className="avatar-image" src={member.fotoUrl} /> : member.foto}
    </span>
  );
}
