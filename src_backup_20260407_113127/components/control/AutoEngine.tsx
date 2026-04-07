"use client";

import { useEffect } from "react";
import { useControlStore } from "@/store/control-store";

export default function AutoEngine() {
  const { startAuto } = useControlStore();

  useEffect(() => {
    startAuto();
  }, []);

  return null;
}
