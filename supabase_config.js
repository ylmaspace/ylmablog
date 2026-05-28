/**
 * ============================================================
 * YLMA Space OS — Supabase Configuration
 * Archivo: supabase-config.js
 * ============================================================
 */

const SUPABASE_URL = "https://jgkrpgracgdzmxlalyyc.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impna3JwZ3JhY2dkem14bGFseXljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2NDc2MjMsImV4cCI6MjA5NTIyMzYyM30.aVvVTUhpOeYuvXQLDdmxX21C2vpRP5mw3NFqj--YID0";

// Inicialización del SDK de Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
