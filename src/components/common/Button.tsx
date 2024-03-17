import { JSX, ParentComponent, mergeProps, splitProps } from "solid-js";
import { clsx } from "clsx";
import "./Button.css";

export const Button: ParentComponent<
  {
    color?: string;
    bgcolor?: string;
    style?: JSX.CSSProperties;
  } & Omit<JSX.HTMLAttributes<HTMLButtonElement>, "style">
> = (props) => {
  const [p, others] = splitProps(props, [
    "color",
    "bgcolor",
    "class",
    "style",
    "children",
  ]);

  return (
    <button
      {...mergeProps(
        {
          class: clsx(p.class, `_button`),
          style: {
            "---button-bg": p.bgcolor,
            "---button-text": p.color,
            ...p.style,
          },
        },
        others
      )}
    >
      {p.children}
    </button>
  );
};
