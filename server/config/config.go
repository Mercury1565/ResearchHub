package config

import "os"

// LLMProvider identifies which AI backend to use for embeddings and chat.
type LLMProvider string

const (
	ProviderGemini    LLMProvider = "gemini"
	ProviderAnthropic LLMProvider = "anthropic"
	ProviderOpenAI    LLMProvider = "openai"
)

type Config struct {
	// Server
	Port           string
	AllowedOrigins string

	// Database
	DatabaseURL string

	// Object Storage (S3-compatible — default: MinIO)
	S3Endpoint        string // e.g. http://localhost:9000 for MinIO
	S3AccessKeyID     string
	S3SecretAccessKey string
	S3Bucket          string
	S3Region          string
	S3UseSSL          bool   // false for local MinIO, true for AWS S3

	// LLM — which provider is active
	LLMProvider LLMProvider

	// API keys — only the active provider's key is required at runtime;
	// the others can be left empty until you add them.
	GeminiAPIKey    string
	AnthropicAPIKey string
	OpenAIAPIKey    string
}

func Load() *Config {
	return &Config{
		Port:           getEnv("PORT", "8080"),
		AllowedOrigins: getEnv("ALLOWED_ORIGINS", "http://localhost:5173"),

		DatabaseURL: getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/researchhub?sslmode=disable"),

		S3Endpoint:        getEnv("S3_ENDPOINT", "http://localhost:9000"),
		S3AccessKeyID:     getEnv("S3_ACCESS_KEY_ID", "minioadmin"),
		S3SecretAccessKey: getEnv("S3_SECRET_ACCESS_KEY", "minioadmin"),
		S3Bucket:          getEnv("S3_BUCKET", "researchhub"),
		S3Region:          getEnv("S3_REGION", "us-east-1"),
		S3UseSSL:          getEnv("S3_USE_SSL", "false") == "true",

		LLMProvider: LLMProvider(getEnv("LLM_PROVIDER", string(ProviderGemini))),

		GeminiAPIKey:    getEnv("GEMINI_API_KEY", ""),
		AnthropicAPIKey: getEnv("ANTHROPIC_API_KEY", ""),
		OpenAIAPIKey:    getEnv("OPENAI_API_KEY", ""),
	}
}

// ActiveAPIKey returns the key for whichever LLM provider is currently selected.
func (c *Config) ActiveAPIKey() string {
	switch c.LLMProvider {
	case ProviderAnthropic:
		return c.AnthropicAPIKey
	case ProviderOpenAI:
		return c.OpenAIAPIKey
	default: // ProviderGemini
		return c.GeminiAPIKey
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
