import { useEffect, useState } from "react";

export default function TransactionToast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 px-4 py-2 rounded shadow-lg text-white z-[1000] transition-all duration-300
        ${type === "success" ? "bg-green-600" : "bg-red-600"}`}
      style={{
        maxWidth: "500px",
        fontWeight: 500,
        opacity: 0.95,
      }}
    >
      {message}
    </div>
  );
}
