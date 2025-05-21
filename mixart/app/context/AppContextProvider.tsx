"use client";

import React, { ReactNode } from "react";

// Import context
import { ControlMenuProvider } from "@/app/context/ControlMenuContext";

import { UserImagesProvider } from "./UserImagesContext";

import { UserContextProvider } from "./UserContext";

import { VersionProvider } from "./VersionContext";

export const AppContextProvider = ({ children }: { children: ReactNode }) => {
  return (
    <UserContextProvider>
        <UserContextProvider>
            <ControlMenuProvider>
                <UserImagesProvider>
                    {children}
                </UserImagesProvider>
            </ControlMenuProvider>
        </UserContextProvider>
    </UserContextProvider>
  );
};