self.onmessage = function (event) {
	const emailData = event.data;
	const rawEmailString = typeof emailData === 'string' ? emailData : '';
	let rawEmails = rawEmailString.split('\n');
	let seenEmails = new Set();
	let invalidEmails = [];
	let validEmails = [];

	rawEmails.forEach((line, lineIndex) => {
		const lineNumber = lineIndex + 1;
		const potentialEmailPattern = /([a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)/gi;
		let lastIndex = 0;
		let match;

		while ((match = potentialEmailPattern.exec(line)) !== null) {
			const textBefore = line.substring(lastIndex, match.index).trim();
			if (textBefore.length > 0) {
				invalidEmails.push({
					lineNumber: lineNumber,
					text: textBefore,
					message: 'Not a valid email format (extraneous text)'
				});
			}

			let email = match[0].trim();
			lastIndex = potentialEmailPattern.lastIndex;

			if (email.length === 0) continue;

			const emailRegex = /^([a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+)@([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)$/;
			const gmailDomainRegex = /@gmail\.com$/i;

			if (!emailRegex.test(email)) {
				invalidEmails.push({
					lineNumber: lineNumber,
					text: email,
					message: 'Invalid email format'
				});
				continue;
			}

			const localPart = email.split('@')[0];
			if (/[^a-zA-Z0-9._-]/.test(localPart)) {
				invalidEmails.push({
					lineNumber: lineNumber,
					text: email,
					message: 'Contains invalid characters in local part'
				});
				continue;
			}

			if (!gmailDomainRegex.test(email)) {
				const domain = email.split('@')[1];
				invalidEmails.push({
					lineNumber: lineNumber,
					text: email,
					message: 'Wrong domain: ' + domain
				});
				continue;
			}

			if (seenEmails.has(email.toLowerCase())) {
				invalidEmails.push({
					lineNumber: lineNumber,
					text: email,
					message: 'Duplicate email'
				});
				continue;
			}

			validEmails.push(email);
			seenEmails.add(email.toLowerCase());
		}

		const remainingText = line.substring(lastIndex).trim();
		if (remainingText.length > 0) {
			invalidEmails.push({
				lineNumber: lineNumber,
				text: remainingText,
				message: 'Not a valid email format (extraneous text)'
			});
		}
	});

	self.postMessage({
		validEmails: validEmails,
		invalidEmails: invalidEmails
	});
};
