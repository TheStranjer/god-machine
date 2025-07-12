export const hitLLMEndpoint = async (prompt, sheet, tool, appendage = []) => {
  const API_URL   = game.settings.get("god-machine", "endpoint");
  const API_TOKEN = game.settings.get("god-machine", "apiKey");
  const API_MODEL = game.settings.get("god-machine", "model");

  if (!API_URL || !API_TOKEN || !API_MODEL) {
    throw new Error("API URL, API Token, or API Model is not set in settings.");
  }

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${API_TOKEN}`
  };

  const messages = [
      {
        role: "system",
        content:
          "You are a highly intelligent AI assistant. " +
          "You are also a character generation agent for Chronicles of Darkness. " +
          "The character sheet's current state is provided as a JSON string in the first `user` " +
          "message as context. Use the information therein to help make the most logical choices."
      },
      { role: "user", content: JSON.stringify(sheet) },
      { role: "user", content: prompt }
    ].concat(appendage);

  const body = JSON.stringify({
    model: API_MODEL,
    messages: messages,
    ...(tool ? { tools: [tool], tool_choice: "required" } : {})
  });

  const res = await fetch(API_URL, { method: "POST", headers, body });

  if (!res.ok) throw new Error(`Network response was not ok (${res.status})`);

  const data = await res.json();

  if (data.error) {
    throw new Error(data.error.message || "The LLM returned an error.");
  }

  return data;
};
