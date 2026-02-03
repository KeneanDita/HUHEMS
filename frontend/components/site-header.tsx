import Link from "next/link"

import { cookies } from "next/headers"

import { MenuIcon } from "lucide-react"

import { parseJwtPayload } from "@/lib/jwt"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet"

import { LogoutButton } from "@/components/logout-button"

const links = {
	home: { href: "/", label: "Home" },
	login: { href: "/auth/login", label: "Student Login" },
	adminLogin: { href: "/auth/admin-login", label: "Admin Login" },
	admin: { href: "/admin", label: "Admin" },
	student: { href: "/student", label: "Student" },
	studentResults: { href: "/student/results", label: "My Results" },
	adminPassword: { href: "/admin/password", label: "Change Password" },
	studentPassword: { href: "/student/password", label: "Change Password" },
}

export async function SiteHeader() {
	const token = (await cookies()).get("huhems_token")?.value
	const role = token ? parseJwtPayload(token)?.role : null
	const isLoggedIn = Boolean(token)
	const isAdmin = role === "admin"
	const isStudent = role === "student"

	return (
		<header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur">
			<div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
				<div className="flex items-center gap-2">
					<Link href={links.home.href} className="font-semibold tracking-tight">
						HUHEMS
					</Link>
				</div>

				<nav className="hidden items-center gap-2 md:flex">
					<Button asChild variant="ghost" size="sm">
						<Link href={links.home.href}>Home</Link>
					</Button>

					{isLoggedIn && isAdmin ? (
						<Button asChild variant="ghost" size="sm">
							<Link href={links.admin.href}>Dashboard</Link>
						</Button>
					) : null}
					{isLoggedIn && isStudent ? (
						<Button asChild variant="ghost" size="sm">
							<Link href={links.student.href}>Dashboard</Link>
						</Button>
					) : null}

					{isLoggedIn && isAdmin ? (
						<Button asChild variant="ghost" size="sm">
							<Link href={links.adminPassword.href}>{links.adminPassword.label}</Link>
						</Button>
					) : null}
					{isLoggedIn && isStudent ? (
						<Button asChild variant="ghost" size="sm">
							<Link href={links.studentPassword.href}>{links.studentPassword.label}</Link>
						</Button>
					) : null}
					{isLoggedIn && isStudent ? (
						<Button asChild variant="ghost" size="sm">
							<Link href={links.studentResults.href}>{links.studentResults.label}</Link>
						</Button>
					) : null}

					{!isLoggedIn ? (
						<>
							<Button asChild variant="outline" size="sm">
								<Link href={links.login.href}>{links.login.label}</Link>
							</Button>
							<Button asChild variant="outline" size="sm">
								<Link href={links.adminLogin.href}>{links.adminLogin.label}</Link>
							</Button>
						</>
					) : (
						<LogoutButton variant="destructive" size="sm">
							Logout
						</LogoutButton>
					)}
				</nav>

				<div className="flex items-center gap-2 md:hidden">
					<Sheet>
						<SheetTrigger asChild>
							<Button variant="outline" size="icon" aria-label="Open menu">
								<MenuIcon className="size-4" />
							</Button>
						</SheetTrigger>
						<SheetContent side="right" className="w-80">
							<SheetHeader>
								<SheetTitle>HUHEMS</SheetTitle>
							</SheetHeader>
							<div className="mt-6 flex flex-col gap-2">
								<Button asChild variant="ghost" className="justify-start">
									<Link href={links.home.href}>Home</Link>
								</Button>
								{isAdmin ? (
									<Button asChild variant="ghost" className="justify-start">
										<Link href={links.admin.href}>Admin Dashboard</Link>
									</Button>
								) : null}
								{isAdmin ? (
									<Button asChild variant="ghost" className="justify-start">
										<Link href={links.adminPassword.href}>{links.adminPassword.label}</Link>
									</Button>
								) : null}
								{isStudent ? (
									<Button asChild variant="ghost" className="justify-start">
										<Link href={links.student.href}>Student Dashboard</Link>
									</Button>
								) : null}
								{isStudent ? (
									<Button asChild variant="ghost" className="justify-start">
										<Link href={links.studentResults.href}>{links.studentResults.label}</Link>
									</Button>
								) : null}
								{isStudent ? (
									<Button asChild variant="ghost" className="justify-start">
										<Link href={links.studentPassword.href}>{links.studentPassword.label}</Link>
									</Button>
								) : null}
								<Separator className="my-2" />
								{!isLoggedIn ? (
									<>
										<Button asChild variant="outline" className="justify-start">
											<Link href={links.login.href}>{links.login.label}</Link>
										</Button>
										<Button asChild variant="outline" className="justify-start">
											<Link href={links.adminLogin.href}>{links.adminLogin.label}</Link>
										</Button>
									</>
								) : (
									<LogoutButton variant="destructive" className="justify-start">
										Logout
									</LogoutButton>
								)}
							</div>
						</SheetContent>
					</Sheet>
				</div>
			</div>
		</header>
	)
}
