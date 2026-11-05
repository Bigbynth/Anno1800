
import { getResourceIcon } from "../resource-icons";
import { pretty } from "../types";

type Props = {
  good: string;
  size?: "small" | "normal";
  status?: "ready" | "unavailable";
};

/** Display only; this token is not stored inventory. */
export function ResourceToken({
  good,
  size = "normal",
  status,
}: Props) {
  return (
    <span
      className={[
        "resource-token",
        `resource-token--${size}`,
        status ? `resource-token--${status}` : "",
      ].filter(Boolean).join(" ")}
      title={`Produces ${pretty(good)}`}
    >
      <span className="resource-token-icon" aria-hidden="true">
        {getResourceIcon(good)}
      </span>
      <span className="resource-token-label">
        {pretty(good)}
      </span>
    </span>
  );
}
