import Header from "@/components/Header";
import {getAuth} from "@/lib/better-auth/auth";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import Footer from "@/components/Footer";
import {MissingMongoUriError} from "@/database/mongoose";

type SessionResult = Awaited<ReturnType<typeof getAuth>> extends {
    api: { getSession: (...args: any[]) => Promise<infer R> };
} ? R : null;

const Layout = async ({ children }: { children : React.ReactNode }) => {
    let session: SessionResult | null = null;

    try {
        const auth = await getAuth();
        const headerList = headers();
        session = await auth.api.getSession({ headers: Object.fromEntries(headerList.entries()) });
    } catch (error) {
        if (error instanceof MissingMongoUriError) {
            console.warn("Skipping session lookup during build: MongoDB URI is missing");
        } else {
            throw error;
        }
    }

    if(!session?.user) redirect('/sign-in');

    const user = {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
    }

    return (
        <main className="min-h-screen text-gray-400">
            <Header user={user} />

            <div className="container py-10">
                {children}
            </div>

            <Footer />
        </main>
    )
}
export default Layout
