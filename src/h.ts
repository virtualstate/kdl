import { f } from "@virtualstate/fringe";

export function h(
  tag: string | symbol,
  options?: Record<string, unknown>,
  ...children: unknown[]
): unknown {
  return f(tag, options, children);
}
