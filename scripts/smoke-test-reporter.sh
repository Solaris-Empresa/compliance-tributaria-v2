#!/bin/bash
# Gate G0 — smoke-test do reporter (Sprint Z-20 #717)
# Wrapper shell que invoca implementação Node (portátil entre Linux/macOS/Windows).
#
# A versão Node (smoke-test-reporter.mjs) testa:
#  T1: append básico
#  T2: concorrência com 10 processos paralelos
#  T3: flush (fsync)
#
# POSIX O_APPEND + Node.js writeSync garantem atomicidade para appends pequenos.
# Não depende de flock (não disponível no git-bash Windows).

set -e
node scripts/smoke-test-reporter.mjs
