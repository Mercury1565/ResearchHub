package services

import (
	"context"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"github.com/researchhub/server/config"
)

type StorageService interface {
	Upload(ctx context.Context, key string, r io.Reader, size int64) error
	PresignedURL(ctx context.Context, key string, ttl time.Duration) (string, error)
	Delete(ctx context.Context, key string) error
}

type minioStorage struct {
	client *minio.Client
	bucket string
}

func NewStorageService(cfg *config.Config) (StorageService, error) {
	endpoint := cfg.S3Endpoint
	endpoint = strings.TrimPrefix(endpoint, "http://")
	endpoint = strings.TrimPrefix(endpoint, "https://")

	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.S3AccessKeyID, cfg.S3SecretAccessKey, ""),
		Secure: cfg.S3UseSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("storage.New: %w", err)
	}

	ctx := context.Background()
	exists, err := client.BucketExists(ctx, cfg.S3Bucket)
	if err != nil {
		return nil, fmt.Errorf("storage.New: check bucket: %w", err)
	}
	if !exists {
		if err := client.MakeBucket(ctx, cfg.S3Bucket, minio.MakeBucketOptions{Region: cfg.S3Region}); err != nil {
			return nil, fmt.Errorf("storage.New: create bucket: %w", err)
		}
	}

	return &minioStorage{client: client, bucket: cfg.S3Bucket}, nil
}

func (s *minioStorage) Upload(ctx context.Context, key string, r io.Reader, size int64) error {
	_, err := s.client.PutObject(ctx, s.bucket, key, r, size, minio.PutObjectOptions{
		ContentType: "application/pdf",
	})
	if err != nil {
		return fmt.Errorf("storage.Upload: %w", err)
	}
	return nil
}

func (s *minioStorage) PresignedURL(ctx context.Context, key string, ttl time.Duration) (string, error) {
	u, err := s.client.PresignedGetObject(ctx, s.bucket, key, ttl, nil)
	if err != nil {
		return "", fmt.Errorf("storage.PresignedURL: %w", err)
	}
	return u.String(), nil
}

func (s *minioStorage) Delete(ctx context.Context, key string) error {
	err := s.client.RemoveObject(ctx, s.bucket, key, minio.RemoveObjectOptions{})
	if err != nil {
		return fmt.Errorf("storage.Delete: %w", err)
	}
	return nil
}
