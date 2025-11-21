-- Script para adicionar coluna qr_code na tabela instances
-- Execute este script no SQL Editor do Supabase

-- Adicionar coluna qr_code para armazenar QR Code em base64
ALTER TABLE instances 
ADD COLUMN IF NOT EXISTS qr_code TEXT;

-- Comentário explicativo
COMMENT ON COLUMN instances.qr_code IS 'QR Code em base64 recebido via webhook qrcode.update';

