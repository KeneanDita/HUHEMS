export function SiteFooter() {
	return (
		<footer className="border-t">
			<div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
				<p>© {new Date().getFullYear()} HUHEMS • Haramaya University</p>
				<p className="text-xs">
					Built with Go + Next.js • Secure, responsive, exam-ready
				</p>
			</div>
		</footer>
	)
}
