"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface EducationModalProps {
  open: boolean;
  onClose: () => void;
  stores: string[];
}

export function EducationModal({ open, onClose, stores }: EducationModalProps) {
  const showIos = stores.includes("app-store");
  const showAndroid = stores.includes("play-store");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>How to capture screenshots</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Take raw screenshots of your app using the tools below, then upload
          them in the next step. You can also skip this and upload images
          manually.
        </p>

        {showIos && (
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">iOS — Xcode Simulator</Badge>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Open your app in Xcode and launch a Simulator.</li>
              <li>
                Navigate to the screen you want to capture.
              </li>
              <li>
                In the menu bar:{" "}
                <span className="font-medium text-foreground">
                  File → Save Screenshot…
                </span>{" "}
                (or press <kbd className="px-1 py-0.5 rounded bg-muted text-xs">⌘S</kbd>).
              </li>
              <li>Save the PNG to a folder — repeat for each screen.</li>
            </ol>
            <p className="text-xs text-muted-foreground">
              Official docs:{" "}
              <a
                href="https://developer.apple.com/documentation/xcode/capturing-screenshots-in-simulator"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                Capturing screenshots in Simulator
              </a>
            </p>
          </section>
        )}

        {showIos && showAndroid && <Separator />}

        {showAndroid && (
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Android — Android Studio Emulator</Badge>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Run your app in an Android Emulator.</li>
              <li>Navigate to the screen you want to capture.</li>
              <li>
                In the emulator toolbar click the{" "}
                <span className="font-medium text-foreground">camera icon</span>{" "}
                (Take screenshot).
              </li>
              <li>
                Screenshots are saved to your Desktop by default — move them to
                a folder.
              </li>
            </ol>
            <p className="text-xs text-muted-foreground">
              Official docs:{" "}
              <a
                href="https://developer.android.com/studio/run/emulator#screenshots"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                Take screenshots with the Android Emulator
              </a>
            </p>
          </section>
        )}

        <Separator />

        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Uploading manually?</strong>{" "}
          No problem — in the next step you can drop any PNG or JPEG files
          directly into the upload zones for each device.
        </p>

        <div className="flex justify-end">
          <Button onClick={onClose}>Got it, continue</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
