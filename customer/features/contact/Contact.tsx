"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import Button from "@/shared/ui/Button";
import { ApiError, submitFeedback } from "@/lib/api";
import { firstError, validateContactForm } from "@/lib/addressValidation";
import { useAuth } from "@/shared/context/AuthContext";

const contactDetails = [
    {
        label: "Phone",
        value: "9823650608",
        icon: (
            <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
        ),
    },
    {
        label: "Address",
        value: "USA",
        icon: (
            <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
            </svg>
        ),
    },
    {
        label: "Email",
        value: "matinacrafts@gmail.com",
        icon: (
            <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
            </svg>
        ),
        className: "break-all"
    },
];

const Contact: React.FC = () => {
    const { user, isLoggedIn, isLoaded } = useAuth();
    const searchParams = useSearchParams();
    const orderRef = (searchParams.get("order") || "").trim();
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        email: "",
        address: "",
        message: "",
    });
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
    const [statusMsg, setStatusMsg] = useState("");
    const [prefilled, setPrefilled] = useState(false);
    const [orderPrefillDone, setOrderPrefillDone] = useState(false);

    useEffect(() => {
        if (!isLoaded || prefilled || !isLoggedIn || !user) return;
        setFormData((prev) => ({
            ...prev,
            name: prev.name || user.name || "",
            email: prev.email || user.email || "",
        }));
        setPrefilled(true);
    }, [isLoaded, isLoggedIn, user, prefilled]);

    useEffect(() => {
        if (!orderRef || orderPrefillDone) return;
        setFormData((prev) => ({
            ...prev,
            message:
                prev.message.trim() ||
                `I need help with order ${orderRef}.\n\nPlease describe the issue below:\n`,
        }));
        setOrderPrefillDone(true);
    }, [orderRef, orderPrefillDone]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setFieldErrors((prev) => {
            const next = { ...prev };
            delete next[name];
            return next;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setStatus("idle");
        setStatusMsg("");

        const check = validateContactForm(formData);
        if (!check.ok) {
            setFieldErrors(check.errors);
            setStatus("err");
            setStatusMsg(firstError(check.errors) || "Please fix the highlighted fields.");
            setSubmitting(false);
            return;
        }

        try {
            const title = orderRef
                ? `Order help — ${orderRef}`
                : `Contact from ${check.value.name}`;
            const comment = [
                check.value.message,
                "",
                orderRef ? `Order ID: ${orderRef}` : null,
                `Name: ${check.value.name}`,
                `Email: ${check.value.email}`,
                `Phone: ${check.value.phone}`,
                `Address: ${check.value.address}`,
            ]
                .filter(Boolean)
                .join("\n");

            await submitFeedback({
                targetType: "business",
                title,
                comment,
            });

            setStatus("ok");
            setStatusMsg("Thank you for contacting us! We will get back to you soon.");
            setFieldErrors({});
            setFormData({
                name: isLoggedIn && user ? user.name || "" : "",
                phone: "",
                email: isLoggedIn && user ? user.email || "" : "",
                address: "",
                message: "",
            });
        } catch (err) {
            setStatus("err");
            setStatusMsg(
                err instanceof ApiError
                    ? err.message
                    : err instanceof Error
                      ? err.message
                      : "Could not send your message. Please try again.",
            );
        } finally {
            setSubmitting(false);
        }
    };

    const fieldClass = (name: string) =>
        `block w-full bg-transparent border px-6 py-2 text-primary placeholder-primary/30 focus:outline-none focus:border-primary transition-colors rounded-2xl ${
            fieldErrors[name] ? "border-red-500" : "border-primary/40"
        }`;

    return (
        <section className="w-full min-h-screen md:h-screen flex flex-col md:flex-row bg-background md:overflow-hidden">
            <div className="relative w-full md:w-1/2 h-auto md:h-full flex flex-col shrink-0 border-b md:border-b-0 md:border-r border-secondary/20">
                <div className="relative w-full h-[300px] md:h-full">
                    <Image
                        src="/images/contact.jpg"
                        alt="Florial Studio Workspace"
                        fill
                        priority
                        className="object-cover"
                    />
                    <div className='absolute w-full h-full top-0 left-0 bg-primary/40'></div>
                </div>

                <div className="absolute bottom-0 w-full grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 md:p-6 shrink-0">
                    {contactDetails.map((detail, index) => (
                        <div
                            key={index}
                            className="bg-primary/80 backdrop-blur-sm border-2 border-secondary/50 p-6 flex flex-col justify-between items-center text-center min-h-[130px] rounded-2xl"
                        >
                            <div className="flex flex-col items-center gap-2">
                                {detail.icon}
                                <span className="text-sm font-heading text-secondary font-bold tracking-widest uppercase">
                                    {detail.label}
                                </span>
                            </div>
                            <p className={`text-xs md:text-sm text-secondary-light/80 font-medium ${detail.className || ""}`}>
                                {detail.value}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="w-full md:w-1/2 h-auto md:h-full flex items-center justify-center p-6 sm:p-12 md:pl-16 mt-10 overflow-y-auto">
                <div className="w-full max-w-2xl flex flex-col gap-2 pb-8">
                    <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl text-primary text-center md:text-left mb-2">
                        Get In Touch
                    </h1>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                        <div className="flex flex-col gap-2">
                            <label htmlFor="name" className="block text-primary text-sm font-semibold tracking-wider">
                                Full Name
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                required
                                autoComplete="name"
                                value={formData.name}
                                onChange={handleChange}
                                className={`block w-full rounded-2xl bg-transparent border px-4 py-2 text-primary placeholder-primary/30 focus:outline-none focus:border-primary transition-colors ${
                                    fieldErrors.name ? "border-red-500" : "border-primary/40"
                                }`}
                            />
                            {fieldErrors.name && (
                                <span className="text-xs text-red-600">{fieldErrors.name}</span>
                            )}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="phone" className="block text-primary text-sm font-semibold tracking-wider">
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                id="phone"
                                name="phone"
                                required
                                autoComplete="tel"
                                inputMode="numeric"
                                placeholder="(415) 555-2671"
                                value={formData.phone}
                                onChange={handleChange}
                                className={fieldClass("phone")}
                            />
                            {fieldErrors.phone && (
                                <span className="text-xs text-red-600">{fieldErrors.phone}</span>
                            )}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="email" className="block text-primary text-sm font-semibold tracking-wider">
                                Email Address
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                required
                                autoComplete="email"
                                value={formData.email}
                                onChange={handleChange}
                                className={fieldClass("email")}
                            />
                            {fieldErrors.email && (
                                <span className="text-xs text-red-600">{fieldErrors.email}</span>
                            )}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="address" className="block text-primary text-sm font-semibold tracking-wider">
                                Address
                            </label>
                            <input
                                type="text"
                                id="address"
                                name="address"
                                required
                                autoComplete="street-address"
                                value={formData.address}
                                onChange={handleChange}
                                className={fieldClass("address")}
                            />
                            {fieldErrors.address && (
                                <span className="text-xs text-red-600">{fieldErrors.address}</span>
                            )}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="message" className="block text-primary text-sm font-semibold tracking-wider">
                                How can we help?
                            </label>
                            <textarea
                                id="message"
                                name="message"
                                required
                                rows={3}
                                value={formData.message}
                                onChange={handleChange}
                                className={`block w-full bg-transparent border px-6 py-2 text-primary placeholder-primary/30 focus:outline-none focus:border-primary transition-colors rounded-3xl resize-none ${
                                    fieldErrors.message ? "border-red-500" : "border-primary/40"
                                }`}
                            />
                            {fieldErrors.message && (
                                <span className="text-xs text-red-600">{fieldErrors.message}</span>
                            )}
                        </div>

                        {status !== "idle" && statusMsg && (
                            <p
                                className={`text-sm font-secondary ${
                                    status === "ok" ? "text-emerald-700" : "text-red-600"
                                }`}
                            >
                                {statusMsg}
                            </p>
                        )}

                        <div className="mt-2">
                            <Button
                                variant="primary"
                                type="submit"
                                disabled={submitting}
                                className="w-full cursor-pointer font-bold tracking-widest uppercase disabled:opacity-60"
                            >
                                {submitting ? "Sending…" : "Send"}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </section>
    );
};

export default Contact;
