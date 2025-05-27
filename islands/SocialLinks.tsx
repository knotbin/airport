import { useEffect, useState } from "preact/hooks";
import * as Icon from 'npm:preact-feather';

interface GitHubRepo {
  stargazers_count: number;
}

export default function SocialLinks() {
  const [starCount, setStarCount] = useState<number | null>(null);

  useEffect(() => {
    const CACHE_KEY = 'github_stars';
    const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

    const fetchRepoInfo = async () => {
      try {
        const response = await fetch("https://api.github.com/repos/knotbin/airport");
        const data: GitHubRepo = await response.json();
        const cacheData = {
          count: data.stargazers_count,
          timestamp: Date.now()
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        setStarCount(data.stargazers_count);
      } catch (error) {
        console.error("Failed to fetch GitHub repo info:", error);
      }
    };

    const getCachedStars = () => {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { count, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          setStarCount(count);
          return true;
        }
      }
      return false;
    };

    if (!getCachedStars()) {
      fetchRepoInfo();
    }
  }, []);

  const formatStarCount = (count: number | null) => {
    if (count === null) return "...";
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  return (
    <div class="mt-8 flex justify-center items-center gap-6">
      <a
        href="https://bsky.app/profile/knotbin.com"
        class="text-gray-600 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
        target="_blank"
        rel="noopener noreferrer"
      >
        <svg
          class="w-6 h-6"
          viewBox="-20 -20 296 266"
          fill="none"
          stroke="currentColor"
          stroke-width="25"
          stroke-linejoin="round"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M55.491 15.172c29.35 22.035 60.917 66.712 72.509 90.686 11.592-23.974 43.159-68.651 72.509-90.686C221.686-.727 256-13.028 256 26.116c0 7.818-4.482 65.674-7.111 75.068-9.138 32.654-42.436 40.983-72.057 35.942 51.775 8.812 64.946 38 36.501 67.187-54.021 55.433-77.644-13.908-83.696-31.676-1.11-3.257-1.63-4.78-1.637-3.485-.008-1.296-.527.228-1.637 3.485-6.052 17.768-29.675 87.11-83.696 31.676-28.445-29.187-15.274-58.375 36.5-67.187-29.62 5.041-62.918-3.288-72.056-35.942C4.482 91.79 0 33.934 0 26.116 0-13.028 34.314-.727 55.491 15.172Z"
          />
        </svg>
      </a>
      <a
        href="https://ko-fi.com/knotbin"
        class="text-gray-600 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Icon.Coffee class="w-6 h-6" />
      </a>
      <a
        href="https://github.com/knotbin/airport"
        class="text-gray-600 hover:text-purple-500 dark:text-gray-400 dark:hover:text-purple-400 transition-colors flex items-center gap-1"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Icon.Github class="w-6 h-6" />
        <span class="text-sm font-mono">{formatStarCount(starCount)}</span>
      </a>
    </div>
  );
} 