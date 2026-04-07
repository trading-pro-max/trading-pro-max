"use client";

import { useEffect } from "react";
import { useCore } from "@/store/core-ai";

export default function SelfEvolutionEngine() {
  const { start } = useCore();

  useEffect(() => {
    start();
  }, []);

  return null;
}
