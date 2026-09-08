export const copyToClipboard = async (text, onSuccess) => {
  try {
    await navigator.clipboard.writeText(text);
    if (onSuccess) {
      onSuccess("Copied to clipboard!");
    }
  } catch (err) {
    console.error("Failed to copy text: ", err);
  }
};