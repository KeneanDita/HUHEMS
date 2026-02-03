"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import * as React from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type LogoutButtonProps = React.ComponentProps<typeof Button>;

export function LogoutButton(props: LogoutButtonProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [open, setOpen] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const { children, onClick: _onClick, ...buttonProps } = props;

	return (
		<AlertDialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (isPending) return;
				if (nextOpen) setError(null);
				setOpen(nextOpen);
			}}
		>
			<AlertDialogTrigger asChild>
				<Button
					{...buttonProps}
					disabled={isPending || buttonProps.disabled}
					onClick={(e) => {
						e.preventDefault();
						setOpen(true);
					}}
				>
					{isPending ? "Logging out..." : (children ?? "Logout")}
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Log out?</AlertDialogTitle>
					<AlertDialogDescription>
						You will need to log in again to access your dashboard.
					</AlertDialogDescription>
				</AlertDialogHeader>
				{error ? (
					<p className="text-sm font-medium text-destructive">{error}</p>
				) : null}
				<AlertDialogFooter>
					<AlertDialogCancel asChild>
						<Button type="button" variant="outline" disabled={isPending}>
							Cancel
						</Button>
					</AlertDialogCancel>
					<AlertDialogAction asChild>
						<Button
							type="button"
							variant="destructive"
							disabled={isPending}
							onClick={(e) => {
								e.preventDefault();
								setError(null);
								startTransition(async () => {
									try {
										const res = await fetch("/api/auth/logout", { method: "POST" });
										if (!res.ok) {
											const text = await res.text();
											throw new Error(text || `Logout failed (${res.status})`);
										}
										setOpen(false);
										router.push("/");
										router.refresh();
									} catch (err: unknown) {
										setError(
											err instanceof Error ? err.message : "Logout failed. Please try again.",
										);
									}
								});
							}}
						>
							Logout
						</Button>
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
