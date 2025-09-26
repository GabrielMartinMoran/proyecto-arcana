export type RollLog = {
	id: string;
	timestamp: Date;
	title: string;
	total: number;
	formattedTotal?: string;
	detail: string;
};
