import { useEffect, useState } from "react";
import { createShortUrl, getAllUrls } from "./api/urlApi";

type ShortUrlResponse = {
    id: string;
    originalUrl: string;
    shortUrl: string;
    shortCode: string;
    clickCount: number;
};

function App() {
    const [url, setUrl] = useState("");
    const [result, setResult] = useState<ShortUrlResponse | null>(null);
    const [urls, setUrls] = useState<ShortUrlResponse[]>([]);
    const [loading, setLoading] = useState(false);

    const loadUrls = async () => {
        try {
            const data = await getAllUrls();
            setUrls(data);
        } catch (error) {
            console.error("Error loading URLs:", error);
        }
    };

    useEffect(() => {
        loadUrls();
    }, []);

    const handleSubmit = async () => {
        try {
            if (!url.trim()) {
                alert("Please enter a URL");
                return;
            }

            setLoading(true);

            console.log("Submitting URL:", url);

            const data = await createShortUrl({
                originalUrl: url,
            });

            console.log("API Response:", data);

            setResult(data);
            setUrl("");
            await loadUrls();
        } catch (error) {
            console.error("Error creating short URL:", error);
            alert("Failed to create short URL. Check browser console.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
            <h1>SnapLink</h1>

            <input
                type="text"
                placeholder="Enter URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                style={{
                    width: "70%",
                    padding: "10px",
                    marginRight: "10px"
                }}
            />

            <button
                onClick={handleSubmit}
                disabled={loading}
            >
                {loading ? "Shortening..." : "Shorten"}
            </button>

            {result && (
                <div style={{ marginTop: "20px" }}>
                    <strong>Short URL:</strong>{" "}
                    <a
                        href={result.shortUrl}
                        target="_blank"
                        rel="noreferrer"
                    >
                        {result.shortUrl}
                    </a>
                </div>
            )}

            <h2 style={{ marginTop: "40px" }}>All URLs</h2>

            <table border={1} cellPadding={10} style={{ width: "100%" }}>
                <thead>
                    <tr>
                        <th>Original URL</th>
                        <th>Short URL</th>
                        <th>Clicks</th>
                    </tr>
                </thead>
                <tbody>
                    {urls.map((item) => (
                        <tr key={item.id}>
                            <td>{item.originalUrl}</td>
                            <td>
                                <a
                                    href={item.shortUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    {item.shortCode}
                                </a>
                            </td>
                            <td>{item.clickCount}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default App;