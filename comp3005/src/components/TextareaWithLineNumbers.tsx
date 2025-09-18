/* eslint-disable */
import { useState } from "react";

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement>; //inherits all normal <textarea> attributes

export default function TextareaWithLineNumbers({ ...props }: Props) {
  const [lineCount, setLineCount] = useState(1);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const lines = value.split("\n").length;
    setLineCount(lines);
    props.onChange?.(e);
  };

  return (
    <div className="relative flex w-full font-mono text-sm">
      <div className="flex flex-col items-end pr-2 pt-2 text-gray-400 select-none bg-gray-100 border-r rounded-l">
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i} className="leading-6">
            {i + 1}
          </div>
        ))}
      </div>

      <textarea
        {...props}
        onChange={handleInput}
        className="flex-1 p-2 outline-none resize-none rounded-r border border-l-0 bg-white"
        style={{ lineHeight: "1.5rem" }}
      />
    </div>
  );
}
