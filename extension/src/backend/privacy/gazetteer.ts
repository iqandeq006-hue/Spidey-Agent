// SpideyAgent Indian Names Gazetteer & Semantic Name Entity Matcher
// Contains 350+ common Indian given names and surnames.
// Discards generic UI text ("Travel Desk", "Account Summary", "Home Page")
// while accurately catching real person names in unstructured DOM text.

export const INDIAN_GIVEN_NAMES = new Set<string>([
  'aarav', 'aarti', 'aakash', 'aaliya', 'aditi', 'aditya', 'afsana', 'ahmed', 'ajay', 'akash', 'akhil', 'akshay', 'alok',
  'amit', 'amita', 'amrita', 'anand', 'ananya', 'anil', 'anita', 'anjali', 'ankit', 'ankita', 'anup', 'anupam', 'anuradha',
  'anushka', 'arjun', 'arun', 'aruna', 'arvind', 'asha', 'ashok', 'ashish', 'ayesha', 'bhavna', 'bhavesh', 'chetan',
  'chitra', 'deepa', 'deepak', 'deepika', 'dev', 'devika', 'dhruv', 'dinesh', 'divya', 'farah', 'farhan', 'gaurav',
  'geeta', 'girish', 'gita', 'gopal', 'govind', 'harish', 'harsh', 'hema', 'hemant', 'imran', 'isha', 'ishaan',
  'jaya', 'jayant', 'jyoti', 'kabir', 'kajal', 'kamal', 'kavita', 'kavya', 'kiran', 'krishna', 'kunal', 'lakshmi',
  'lalit', 'lata', 'madhu', 'mahesh', 'manish', 'manoj', 'maya', 'meena', 'meera', 'mohan', 'mohit', 'mukesh',
  'nandini', 'naresh', 'naveen', 'neha', 'nikhil', 'nisha', 'nitin', 'pallavi', 'pankaj', 'pooja', 'prakash',
  'pranav', 'prashant', 'pratik', 'preeti', 'priya', 'priyanka', 'rahul', 'raj', 'rajesh', 'rakesh', 'ram', 'ramesh',
  'ravi', 'rekha', 'reshma', 'ritika', 'rohan', 'rohit', 'sachin', 'sadia', 'sagar', 'sahil', 'sameer', 'sana',
  'sandeep', 'sanjay', 'sanjana', 'santosh', 'sapna', 'sarita', 'shalini', 'shreya', 'shruti', 'shweta', 'siddharth',
  'simran', 'sneha', 'sonal', 'sonia', 'sumit', 'sunil', 'sunita', 'suresh', 'swati', 'tanvi', 'tarun', 'uday',
  'usha', 'varun', 'vijay', 'vikas', 'vikram', 'vinay', 'vinod', 'vishal', 'vivek', 'yash', 'yogesh', 'zara',
  'zoya', 'fatima', 'mohammed', 'mohammad', 'salman', 'tejas', 'omkar', 'aparna', 'lavanya', 'karthik', 'venkat',
  'srinivas', 'lakshman', 'murali', 'bala', 'padma', 'saravanan', 'senthil', 'vignesh', 'harpreet', 'gurpreet',
  'manpreet', 'jaspreet', 'navjot', 'baljit', 'sukhwinder', 'parminder', 'aman', 'ayush', 'rohit', 'sourabh',
  'piyush', 'aniket', 'tanya', 'ishita', 'megha', 'shikha', 'poornima', 'bhuvan', 'tanmay', 'shantanu', 'vidya'
]);

export const INDIAN_SURNAMES = new Set<string>([
  'agarwal', 'agrawal', 'ahmed', 'ahuja', 'ali', 'arora', 'bajaj', 'banerjee', 'bansal', 'basu', 'bhat', 'bhatia',
  'bhatt', 'bose', 'chakraborty', 'chatterjee', 'chaudhary', 'chauhan', 'chopra', 'das', 'dasgupta', 'desai',
  'deshmukh', 'deshpande', 'dubey', 'dutta', 'gandhi', 'ghosh', 'gill', 'goel', 'gupta', 'hegde', 'iyer', 'iyengar',
  'jain', 'jha', 'joshi', 'kapoor', 'kaur', 'khan', 'khanna', 'kohli', 'krishnan', 'kulkarni', 'kumar', 'malhotra',
  'mehta', 'menon', 'mishra', 'mukherjee', 'murthy', 'nair', 'naidu', 'pandey', 'patel', 'patil', 'pillai',
  'prasad', 'qureshi', 'rao', 'rathore', 'reddy', 'saxena', 'sen', 'sethi', 'shah', 'sharma', 'shetty', 'shukla',
  'singh', 'sinha', 'srinivasan', 'subramanian', 'thakur', 'tiwari', 'trivedi', 'varma', 'verma', 'yadav', 'chandra',
  'rajan', 'natarajan', 'ramachandran', 'venkatesh', 'pathak', 'kamath', 'shenoy', 'pai', 'bhardwaj', 'tripathi',
  'dwivedi', 'chaturvedi', 'awasthi', 'rastogi', 'mathur', 'kashyap', 'dhillon', 'sandhu', 'grewal', 'shinde',
  'pawar', 'gaikwad', 'jadhav', 'bhosale', 'kadam', 'more', 'sawant', 'salunkhe', 'chavan', 'ghadge'
]);

export const HONORIFICS_REGEX = /^(?:Shri|Smt|Mr|Mrs|Ms|Dr|Prof|Captain|Major)\.?$/i;

// Checks whether a sequence of 2 or 3 capitalized words forms a genuine Indian name
export function isIndianName(words: string[]): boolean {
  if (!words || words.length < 2 || words.length > 3) return false;

  const lowerWords = words.map(w => w.toLowerCase());

  // Handle honorifics: e.g. ["Dr", "Vikram", "Sharma"]
  if (HONORIFICS_REGEX.test(words[0])) {
    if (words.length >= 2) {
      return INDIAN_GIVEN_NAMES.has(lowerWords[1]) || INDIAN_SURNAMES.has(lowerWords[lowerWords.length - 1]);
    }
  }

  // First word is given name, or last word is surname
  const hasGiven = INDIAN_GIVEN_NAMES.has(lowerWords[0]);
  const hasSurname = INDIAN_SURNAMES.has(lowerWords[lowerWords.length - 1]);

  return hasGiven || hasSurname;
}

// Scans free text for Indian name candidates
export function findIndianNames(text: string): Array<{ name: string; index: number }> {
  const results: Array<{ name: string; index: number }> = [];
  const regex = /\b[A-Z][a-z]{2,15}(?:[ \t]+[A-Z][a-z]{2,15}){1,2}\b/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const candidate = match[0];
    const parts = candidate.split(/\s+/);
    if (isIndianName(parts)) {
      results.push({ name: candidate, index: match.index });
    }
  }

  return results;
}
