// Data source: https://github.com/Automedon/ultimate-leetcode-patterns
// "The Ultimate High-ROI LeetCode Patterns Guide" — 41 patterns, ~20 problems each.
// Problems are grouped exactly as in the README and ordered Easy -> Hard.

export type Difficulty = "Easy" | "Medium" | "Hard";

export interface LeetProblem {
  /** Stable, order-independent key: `${patternSlug}:${problemSlug}` */
  key: string;
  title: string;
  slug: string;
  url: string;
  difficulty: Difficulty;
}

export interface LeetPattern {
  /**
   * 1-based array position. Kept only for display (zero-padded label) and for
   * generating the legacy migration map. NOT used as a storage or URL key --
   * those use the order-independent `slug`.
   */
  id: number;
  /** Order-independent, URL- and storage-safe key derived from `name`. */
  slug: string;
  name: string;
  problems: LeetProblem[];
}

/** Lowercase, hyphenated, URL-safe slug. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const LEETCODE_URL_BASE = "https://leetcode.com/problems/";

const E: Difficulty = "Easy";
const M: Difficulty = "Medium";
const H: Difficulty = "Hard";

type Row = [title: string, slug: string, difficulty: Difficulty];

interface RawPattern {
  name: string;
  rows: Row[];
}

const RAW_PATTERNS: RawPattern[] = [
  {
    name: "Hash Map / Hash Set",
    rows: [
      ["Two Sum", "two-sum", E],
      ["Contains Duplicate", "contains-duplicate", E],
      ["Valid Anagram", "valid-anagram", E],
      ["Isomorphic Strings", "isomorphic-strings", E],
      ["Word Pattern", "word-pattern", E],
      ["Ransom Note", "ransom-note", E],
      ["Longest Palindrome", "longest-palindrome", E],
      ["Number of Equivalent Domino Pairs", "number-of-equivalent-domino-pairs", E],
      ["Group Anagrams", "group-anagrams", M],
      ["Top K Frequent Elements", "top-k-frequent-elements", M],
      ["Longest Consecutive Sequence", "longest-consecutive-sequence", M],
      ["Subarray Sum Equals K", "subarray-sum-equals-k", M],
      ["Find the Duplicate Number", "find-the-duplicate-number", M],
      ["Four Sum II", "4sum-ii", M],
      ["Brick Wall", "brick-wall", M],
      ["Check If a String Contains All Binary Codes of Size K", "check-if-a-string-contains-all-binary-codes-of-size-k", M],
      ["Continuous Subarray Sum", "continuous-subarray-sum", M],
      ["Insert Delete GetRandom O(1)", "insert-delete-getrandom-o1", M],
      ["Subarrays with K Different Integers", "subarrays-with-k-different-integers", H],
      ["First Missing Positive", "first-missing-positive", H]
    ]
  },
  {
    name: "Sliding Window",
    rows: [
      ["Best Time to Buy and Sell Stock", "best-time-to-buy-and-sell-stock", E],
      ["Longest Substring Without Repeating Characters", "longest-substring-without-repeating-characters", M],
      ["Minimum Size Subarray Sum", "minimum-size-subarray-sum", M],
      ["Longest Repeating Character Replacement", "longest-repeating-character-replacement", M],
      ["Permutation in String", "permutation-in-string", M],
      ["Find All Anagrams in a String", "find-all-anagrams-in-a-string", M],
      ["Fruit Into Baskets", "fruit-into-baskets", M],
      ["Max Consecutive Ones III", "max-consecutive-ones-iii", M],
      ["Subarray Product Less Than K", "subarray-product-less-than-k", M],
      ["Longest Subarray of 1's After Deleting One Element", "longest-subarray-of-1s-after-deleting-one-element", M],
      ["Maximum Number of Vowels in a Substring of Given Length", "maximum-number-of-vowels-in-a-substring-of-given-length", M],
      ["Count Number of Nice Subarrays", "count-number-of-nice-subarrays", M],
      ["Binary Subarrays With Sum", "binary-subarrays-with-sum", M],
      ["Maximum Erasure Value", "maximum-erasure-value", M],
      ["Grumpy Bookstore Owner", "grumpy-bookstore-owner", M],
      ["Frequency of the Most Frequent Element", "frequency-of-the-most-frequent-element", M],
      ["Minimum Number of Flips to Make the Binary String Alternating", "minimum-number-of-flips-to-make-the-binary-string-alternating", M],
      ["Minimum Window Substring", "minimum-window-substring", H],
      ["Sliding Window Maximum", "sliding-window-maximum", H],
      ["Subarrays with K Different Integers", "subarrays-with-k-different-integers", H]
    ]
  },
  {
    name: "Two Pointers",
    rows: [
      ["Valid Palindrome", "valid-palindrome", E],
      ["Reverse String", "reverse-string", E],
      ["Move Zeroes", "move-zeroes", E],
      ["Remove Element", "remove-element", E],
      ["Squares of a Sorted Array", "squares-of-a-sorted-array", E],
      ["Remove Duplicates from Sorted Array", "remove-duplicates-from-sorted-array", E],
      ["Valid Palindrome II", "valid-palindrome-ii", E],
      ["Backspace String Compare", "backspace-string-compare", E],
      ["Two Sum II - Input Array Is Sorted", "two-sum-ii-input-array-is-sorted", M],
      ["Remove Duplicates from Sorted Array II", "remove-duplicates-from-sorted-array-ii", M],
      ["Sort Colors", "sort-colors", M],
      ["Rotate Array", "rotate-array", M],
      ["4Sum", "4sum", M],
      ["Sort Array By Parity II", "sort-array-by-parity-ii", E],
      ["Container With Most Water", "container-with-most-water", M],
      ["Partition Labels", "partition-labels", M],
      ["Boats to Save People", "boats-to-save-people", M],
      ["Number of Subsequences That Satisfy the Given Sum Condition", "number-of-subsequences-that-satisfy-the-given-sum-condition", M],
      ["Trapping Rain Water", "trapping-rain-water", H],
      ["Minimum Window Subsequence", "minimum-window-subsequence", H]
    ]
  },
  {
    name: "Binary Search",
    rows: [
      ["Binary Search", "binary-search", E],
      ["Search Insert Position", "search-insert-position", E],
      ["Sqrt(x)", "sqrtx", E],
      ["Find First and Last Position of Element in Sorted Array", "find-first-and-last-position-of-element-in-sorted-array", M],
      ["Search in Rotated Sorted Array", "search-in-rotated-sorted-array", M],
      ["Search in Rotated Sorted Array II", "search-in-rotated-sorted-array-ii", M],
      ["Find Minimum in Rotated Sorted Array", "find-minimum-in-rotated-sorted-array", M],
      ["Search a 2D Matrix", "search-a-2d-matrix", M],
      ["Koko Eating Bananas", "koko-eating-bananas", M],
      ["Capacity To Ship Packages Within D Days", "capacity-to-ship-packages-within-d-days", M],
      ["Find Peak Element", "find-peak-element", M],
      ["Find the Smallest Divisor Given a Threshold", "find-the-smallest-divisor-given-a-threshold", M],
      ["Kth Smallest Element in a Sorted Matrix", "kth-smallest-element-in-a-sorted-matrix", M],
      ["Single Element in a Sorted Array", "single-element-in-a-sorted-array", M],
      ["Time Based Key-Value Store", "time-based-key-value-store", M],
      ["Minimum Number of Days to Make m Bouquets", "minimum-number-of-days-to-make-m-bouquets", M],
      ["Find K Closest Elements", "find-k-closest-elements", M],
      ["Peak Index in a Mountain Array", "peak-index-in-a-mountain-array", M],
      ["Median of Two Sorted Arrays", "median-of-two-sorted-arrays", H],
      ["Split Array Largest Sum", "split-array-largest-sum", H]
    ]
  },
  {
    name: "Prefix Sum",
    rows: [
      ["Range Sum Query - Immutable", "range-sum-query-immutable", E],
      ["Find Pivot Index", "find-pivot-index", E],
      ["Find the Highest Altitude", "find-the-highest-altitude", E],
      ["Range Sum Query 2D - Immutable", "range-sum-query-2d-immutable", M],
      ["Subarray Sum Equals K", "subarray-sum-equals-k", M],
      ["Maximum Size Subarray Sum Equals k — substitute: Contiguous Array", "contiguous-array", M],
      ["Product of Array Except Self", "product-of-array-except-self", M],
      ["Continuous Subarray Sum", "continuous-subarray-sum", M],
      ["Maximum Subarray", "maximum-subarray", M],
      ["Path Sum III", "path-sum-iii", M],
      ["Count Number of Nice Subarrays", "count-number-of-nice-subarrays", M],
      ["Binary Subarrays With Sum", "binary-subarrays-with-sum", M],
      ["Number of Sub-arrays With Odd Sum", "number-of-sub-arrays-with-odd-sum", M],
      ["Minimum Value to Get Positive Step by Step Sum", "minimum-value-to-get-positive-step-by-step-sum", M],
      ["Maximum Sum of Two Non-Overlapping Subarrays", "maximum-sum-of-two-non-overlapping-subarrays", M],
      ["Range Sum Query - Mutable", "range-sum-query-mutable", M],
      ["Make Sum Divisible by P", "make-sum-divisible-by-p", M],
      ["Matrix Block Sum", "matrix-block-sum", M],
      ["Count Square Submatrices with All Ones", "count-square-submatrices-with-all-ones", M],
      ["Number of Ways to Split Array", "number-of-ways-to-split-array", M]
    ]
  },
  {
    name: "String Manipulation / Parsing",
    rows: [
      ["Valid Parentheses", "valid-parentheses", E],
      ["Longest Common Prefix", "longest-common-prefix", E],
      ["Repeated Substring Pattern", "repeated-substring-pattern", E],
      ["Implement strStr() — substitute: Find the Index of the First Occurrence in a String", "find-the-index-of-the-first-occurrence-in-a-string", E],
      ["String to Integer (atoi)", "string-to-integer-atoi", M],
      ["Zigzag Conversion", "zigzag-conversion", M],
      ["Group Anagrams", "group-anagrams", M],
      ["Multiply Strings", "multiply-strings", M],
      ["Compare Version Numbers", "compare-version-numbers", M],
      ["Decode Ways", "decode-ways", M],
      ["Simplify Path", "simplify-path", M],
      ["Word Break", "word-break", M],
      ["Longest Palindromic Substring", "longest-palindromic-substring", M],
      ["Count and Say", "count-and-say", M],
      ["Group Shifted Strings", "group-shifted-strings", M],
      ["Reorganize String", "reorganize-string", M],
      ["Decode String", "decode-string", M],
      ["Text Justification", "text-justification", H],
      ["Basic Calculator", "basic-calculator", H],
      ["Minimum Window Substring", "minimum-window-substring", H]
    ]
  },
  {
    name: "String Matching / Pattern Search",
    rows: [
      ["Implement strStr() — substitute: Find the Index of the First Occurrence in a String", "find-the-index-of-the-first-occurrence-in-a-string", E],
      ["Repeated Substring Pattern", "repeated-substring-pattern", E],
      ["Valid Anagram", "valid-anagram", E],
      ["Shortest Distance to a Character", "shortest-distance-to-a-character", E],
      ["Index Pairs of a String", "index-pairs-of-a-string", E],
      ["Find All Anagrams in a String", "find-all-anagrams-in-a-string", M],
      ["Permutation in String", "permutation-in-string", M],
      ["Longest Palindromic Substring", "longest-palindromic-substring", M],
      ["Group Shifted Strings", "group-shifted-strings", M],
      ["Camelcase Matching", "camelcase-matching", M],
      ["Number of Matching Subsequences", "number-of-matching-subsequences", M],
      ["Shortest Palindrome", "shortest-palindrome", H],
      ["Wildcard Matching", "wildcard-matching", H],
      ["Regular Expression Matching", "regular-expression-matching", H],
      ["Longest Happy Prefix", "longest-happy-prefix", H],
      ["Find All Good Strings — substitute: Distinct Echo Substrings", "distinct-echo-substrings", H],
      ["Minimum Window Substring", "minimum-window-substring", H],
      ["Stream of Characters", "stream-of-characters", H],
      ["Palindrome Pairs", "palindrome-pairs", H],
      ["Concatenated Words", "concatenated-words", H]
    ]
  },
  {
    name: "Stack",
    rows: [
      ["Valid Parentheses", "valid-parentheses", E],
      ["Remove All Adjacent Duplicates in String", "remove-all-adjacent-duplicates-in-string", E],
      ["Make The String Great", "make-the-string-great", E],
      ["Next Greater Element I", "next-greater-element-i", E],
      ["Backspace String Compare", "backspace-string-compare", E],
      ["Build a String From Another String — substitute: Baseball Game", "baseball-game", E],
      ["Min Stack", "min-stack", M],
      ["Evaluate Reverse Polish Notation", "evaluate-reverse-polish-notation", M],
      ["Generate Parentheses", "generate-parentheses", M],
      ["Daily Temperatures", "daily-temperatures", M],
      ["Decode String", "decode-string", M],
      ["Asteroid Collision", "asteroid-collision", M],
      ["Simplify Path", "simplify-path", M],
      ["Basic Calculator II", "basic-calculator-ii", M],
      ["Remove All Adjacent Duplicates in String II", "remove-all-adjacent-duplicates-in-string-ii", M],
      ["Score of Parentheses", "score-of-parentheses", M],
      ["Exclusive Time of Functions", "exclusive-time-of-functions", M],
      ["Minimum Add to Make Parentheses Valid", "minimum-add-to-make-parentheses-valid", M],
      ["Validate Stack Sequences", "validate-stack-sequences", M],
      ["Basic Calculator", "basic-calculator", H]
    ]
  },
  {
    name: "Monotonic Stack / Queue (Specific Variants)",
    rows: [
      ["Next Greater Element I", "next-greater-element-i", E],
      ["Daily Temperatures", "daily-temperatures", M],
      ["Next Greater Element II", "next-greater-element-ii", M],
      ["Remove K Digits", "remove-k-digits", M],
      ["Remove Duplicate Letters", "remove-duplicate-letters", M],
      ["Sum of Subarray Minimums", "sum-of-subarray-minimums", M],
      ["Online Stock Span", "online-stock-span", M],
      ["132 Pattern", "132-pattern", M],
      ["Car Fleet", "car-fleet", M],
      ["Next Greater Node In Linked List", "next-greater-node-in-linked-list", M],
      ["Find the Most Competitive Subsequence", "find-the-most-competitive-subsequence", M],
      ["Maximum Width Ramp", "maximum-width-ramp", M],
      ["Sum of Subarray Ranges", "sum-of-subarray-ranges", M],
      ["Steps to Make Array Non-decreasing", "steps-to-make-array-non-decreasing", M],
      ["Largest Rectangle in Histogram", "largest-rectangle-in-histogram", H],
      ["Trapping Rain Water", "trapping-rain-water", H],
      ["Maximal Rectangle", "maximal-rectangle", H],
      ["Sliding Window Maximum", "sliding-window-maximum", H],
      ["Shortest Subarray with Sum at Least K", "shortest-subarray-with-sum-at-least-k", H],
      ["Constrained Subsequence Sum", "constrained-subsequence-sum", H]
    ]
  },
  {
    name: "Queue / Deque",
    rows: [
      ["Implement Queue using Stacks", "implement-queue-using-stacks", E],
      ["Implement Stack using Queues", "implement-stack-using-queues", E],
      ["Moving Average from Data Stream — substitute: Number of Recent Calls", "number-of-recent-calls", E],
      ["Time Needed to Buy Tickets", "time-needed-to-buy-tickets", E],
      ["Design Circular Queue", "design-circular-queue", M],
      ["Design Circular Deque", "design-circular-deque", M],
      ["Dota2 Senate", "dota2-senate", M],
      ["Reveal Cards In Increasing Order", "reveal-cards-in-increasing-order", M],
      ["Design Front Middle Back Queue", "design-front-middle-back-queue", M],
      ["Maximum Number of Robots Within Budget", "maximum-number-of-robots-within-budget", M],
      ["First Unique Number", "first-unique-number", M],
      ["Design Snake Game", "design-snake-game", M],
      ["Sum of Subarray Minimums", "sum-of-subarray-minimums", M],
      ["Jump Game VI", "jump-game-vi", M],
      ["Find the Winner of the Circular Game", "find-the-winner-of-the-circular-game", M],
      ["Maximum Sum of Two Non-Overlapping Subarrays", "maximum-sum-of-two-non-overlapping-subarrays", M],
      ["Sliding Window Maximum", "sliding-window-maximum", H],
      ["Shortest Subarray with Sum at Least K", "shortest-subarray-with-sum-at-least-k", H],
      ["Constrained Subsequence Sum", "constrained-subsequence-sum", H],
      ["Stamping The Sequence", "stamping-the-sequence", H]
    ]
  },
  {
    name: "Tree DFS (Preorder / Inorder / Postorder)",
    rows: [
      ["Binary Tree Inorder Traversal", "binary-tree-inorder-traversal", E],
      ["Binary Tree Preorder Traversal", "binary-tree-preorder-traversal", E],
      ["Binary Tree Postorder Traversal", "binary-tree-postorder-traversal", E],
      ["Maximum Depth of Binary Tree", "maximum-depth-of-binary-tree", E],
      ["Path Sum", "path-sum", E],
      ["Diameter of Binary Tree", "diameter-of-binary-tree", E],
      ["Balanced Binary Tree", "balanced-binary-tree", E],
      ["Same Tree", "same-tree", E],
      ["Symmetric Tree", "symmetric-tree", E],
      ["Invert Binary Tree", "invert-binary-tree", E],
      ["Path Sum II", "path-sum-ii", M],
      ["Lowest Common Ancestor of a Binary Tree", "lowest-common-ancestor-of-a-binary-tree", M],
      ["Construct Binary Tree from Preorder and Inorder Traversal", "construct-binary-tree-from-preorder-and-inorder-traversal", M],
      ["Flatten Binary Tree to Linked List", "flatten-binary-tree-to-linked-list", M],
      ["Sum Root to Leaf Numbers", "sum-root-to-leaf-numbers", M],
      ["Path Sum III", "path-sum-iii", M],
      ["Count Good Nodes in Binary Tree", "count-good-nodes-in-binary-tree", M],
      ["Binary Tree Pruning", "binary-tree-pruning", M],
      ["All Nodes Distance K in Binary Tree", "all-nodes-distance-k-in-binary-tree", M],
      ["Binary Tree Maximum Path Sum", "binary-tree-maximum-path-sum", H]
    ]
  },
  {
    name: "Tree BFS (Level Order)",
    rows: [
      ["Average of Levels in Binary Tree", "average-of-levels-in-binary-tree", E],
      ["Minimum Depth of Binary Tree", "minimum-depth-of-binary-tree", E],
      ["Cousins in Binary Tree", "cousins-in-binary-tree", E],
      ["N-ary Tree Level Order Traversal", "n-ary-tree-level-order-traversal", E],
      ["Binary Tree Level Order Traversal", "binary-tree-level-order-traversal", M],
      ["Binary Tree Level Order Traversal II", "binary-tree-level-order-traversal-ii", M],
      ["Binary Tree Zigzag Level Order Traversal", "binary-tree-zigzag-level-order-traversal", M],
      ["Binary Tree Right Side View", "binary-tree-right-side-view", M],
      ["Populating Next Right Pointers in Each Node", "populating-next-right-pointers-in-each-node", M],
      ["Populating Next Right Pointers in Each Node II", "populating-next-right-pointers-in-each-node-ii", M],
      ["Maximum Width of Binary Tree", "maximum-width-of-binary-tree", M],
      ["Find Largest Value in Each Tree Row", "find-largest-value-in-each-tree-row", M],
      ["Binary Tree Vertical Order Traversal — substitute: Find Bottom Left Tree Value", "find-bottom-left-tree-value", M],
      ["Add One Row to Tree", "add-one-row-to-tree", M],
      ["Level Order Traversal Distinct Values — substitute: Deepest Leaves Sum", "deepest-leaves-sum", M],
      ["Smallest String Starting From Leaf", "smallest-string-starting-from-leaf", M],
      ["Binary Tree Coloring Game", "binary-tree-coloring-game", M],
      ["Step-By-Step Directions From a Binary Tree Node to Another", "step-by-step-directions-from-a-binary-tree-node-to-another", M],
      ["Check Completeness of a Binary Tree", "check-completeness-of-a-binary-tree", M],
      ["Cousins in Binary Tree II", "cousins-in-binary-tree-ii", M]
    ]
  },
  {
    name: "Dynamic Programming - 1D",
    rows: [
      ["Climbing Stairs", "climbing-stairs", E],
      ["House Robber", "house-robber", M],
      ["House Robber II", "house-robber-ii", M],
      ["Maximum Subarray", "maximum-subarray", M],
      ["Coin Change", "coin-change", M],
      ["Longest Increasing Subsequence", "longest-increasing-subsequence", M],
      ["Word Break", "word-break", M],
      ["Decode Ways", "decode-ways", M],
      ["Jump Game", "jump-game", M],
      ["Maximum Product Subarray", "maximum-product-subarray", M],
      ["Best Time to Buy and Sell Stock with Cooldown", "best-time-to-buy-and-sell-stock-with-cooldown", M],
      ["Partition Equal Subset Sum", "partition-equal-subset-sum", M],
      ["Coin Change II", "coin-change-ii", M],
      ["Combination Sum IV", "combination-sum-iv", M],
      ["Perfect Squares", "perfect-squares", M],
      ["Wiggle Subsequence", "wiggle-subsequence", M],
      ["Number of Longest Increasing Subsequence", "number-of-longest-increasing-subsequence", M],
      ["Minimum Cost For Tickets", "minimum-cost-for-tickets", M],
      ["Delete and Earn", "delete-and-earn", M],
      ["Maximum Length of Repeated Subarray", "maximum-length-of-repeated-subarray", M]
    ]
  },
  {
    name: "Recursion / Divide and Conquer",
    rows: [
      ["Convert Sorted Array to Binary Search Tree", "convert-sorted-array-to-binary-search-tree", E],
      ["Merge Sort — substitute: Sort an Array", "sort-an-array", M],
      ["Pow(x, n)", "powx-n", M],
      ["Maximum Subarray", "maximum-subarray", M],
      ["Different Ways to Add Parentheses", "different-ways-to-add-parentheses", M],
      ["Kth Largest Element in an Array", "kth-largest-element-in-an-array", M],
      ["Construct Binary Tree from Preorder and Inorder Traversal", "construct-binary-tree-from-preorder-and-inorder-traversal", M],
      ["Beautiful Array", "beautiful-array", M],
      ["Unique Binary Search Trees II", "unique-binary-search-trees-ii", M],
      ["Maximum Score Words Formed by Letters", "maximum-score-words-formed-by-letters", M],
      ["Super Pow", "super-pow", M],
      ["The Skyline Problem", "the-skyline-problem", H],
      ["Count of Smaller Numbers After Self", "count-of-smaller-numbers-after-self", H],
      ["Median of Two Sorted Arrays", "median-of-two-sorted-arrays", H],
      ["Reverse Pairs", "reverse-pairs", H],
      ["Expression Add Operators", "expression-add-operators", H],
      ["Strange Printer", "strange-printer", H],
      ["Minimum Cost to Merge Stones", "minimum-cost-to-merge-stones", H],
      ["Burst Balloons", "burst-balloons", H],
      ["Count of Range Sum", "count-of-range-sum", H]
    ]
  },
  {
    name: "Backtracking / Subsets / Combinations / Permutations",
    rows: [
      ["Subsets", "subsets", M],
      ["Letter Case Permutation", "letter-case-permutation", M],
      ["Generate Parentheses", "generate-parentheses", M],
      ["Combinations", "combinations", M],
      ["Combination Sum", "combination-sum", M],
      ["Subsets II", "subsets-ii", M],
      ["Permutations", "permutations", M],
      ["Permutations II", "permutations-ii", M],
      ["Combination Sum II", "combination-sum-ii", M],
      ["Combination Sum III", "combination-sum-iii", M],
      ["Letter Combinations of a Phone Number", "letter-combinations-of-a-phone-number", M],
      ["Beautiful Arrangement", "beautiful-arrangement", M],
      ["Word Search", "word-search", M],
      ["Palindrome Partitioning", "palindrome-partitioning", M],
      ["Restore IP Addresses", "restore-ip-addresses", M],
      ["Gray Code", "gray-code", M],
      ["Factor Combinations", "factor-combinations", M],
      ["Partition to K Equal Sum Subsets", "partition-to-k-equal-sum-subsets", M],
      ["N-Queens", "n-queens", H],
      ["Sudoku Solver", "sudoku-solver", H]
    ]
  },
  {
    name: "Graph DFS",
    rows: [
      ["Flood Fill", "flood-fill", E],
      ["Number of Islands", "number-of-islands", M],
      ["Max Area of Island", "max-area-of-island", M],
      ["Clone Graph", "clone-graph", M],
      ["Pacific Atlantic Water Flow", "pacific-atlantic-water-flow", M],
      ["Surrounded Regions", "surrounded-regions", M],
      ["Course Schedule", "course-schedule", M],
      ["Number of Provinces", "number-of-provinces", M],
      ["Number of Enclaves", "number-of-enclaves", M],
      ["Keys and Rooms", "keys-and-rooms", M],
      ["Reorder Routes to Make All Paths Lead to the City Zero", "reorder-routes-to-make-all-paths-lead-to-the-city-zero", M],
      ["All Paths From Source to Target", "all-paths-from-source-to-target", M],
      ["Find Eventual Safe States", "find-eventual-safe-states", M],
      ["Number of Closed Islands", "number-of-closed-islands", M],
      ["Time Needed to Inform All Employees", "time-needed-to-inform-all-employees", M],
      ["Most Stones Removed with Same Row or Column", "most-stones-removed-with-same-row-or-column", M],
      ["Detonate the Maximum Bombs", "detonate-the-maximum-bombs", M],
      ["Count Sub Islands", "count-sub-islands", M],
      ["Path with Maximum Probability", "path-with-maximum-probability", M],
      ["Making A Large Island", "making-a-large-island", H]
    ]
  },
  {
    name: "Graph BFS",
    rows: [
      ["Rotting Oranges", "rotting-oranges", M],
      ["01 Matrix", "01-matrix", M],
      ["Shortest Path in Binary Matrix", "shortest-path-in-binary-matrix", M],
      ["Open the Lock", "open-the-lock", M],
      ["Snakes and Ladders", "snakes-and-ladders", M],
      ["Nearest Exit from Entrance in Maze", "nearest-exit-from-entrance-in-maze", M],
      ["As Far from Land as Possible", "as-far-from-land-as-possible", M],
      ["Shortest Path with Alternating Colors", "shortest-path-with-alternating-colors", M],
      ["Jump Game III", "jump-game-iii", M],
      ["Minimum Genetic Mutation", "minimum-genetic-mutation", M],
      ["Cheapest Flights Within K Stops", "cheapest-flights-within-k-stops", M],
      ["Shortest Bridge", "shortest-bridge", M],
      ["Get Watched Videos by Your Friends", "get-watched-videos-by-your-friends", M],
      ["Walls and Gates — substitute: Map of Highest Peak", "map-of-highest-peak", M],
      ["Word Ladder", "word-ladder", H],
      ["Bus Routes", "bus-routes", H],
      ["Shortest Path to Get All Keys", "shortest-path-to-get-all-keys", H],
      ["Minimum Number of Days to Disconnect Island", "minimum-number-of-days-to-disconnect-island", H],
      ["Shortest Path in a Grid with Obstacles Elimination", "shortest-path-in-a-grid-with-obstacles-elimination", H],
      ["Word Ladder II", "word-ladder-ii", H]
    ]
  },
  {
    name: "Matrix / Grid Traversal",
    rows: [
      ["Island Perimeter", "island-perimeter", E],
      ["Flood Fill", "flood-fill", E],
      ["Toeplitz Matrix", "toeplitz-matrix", E],
      ["Transpose Matrix", "transpose-matrix", E],
      ["Number of Islands", "number-of-islands", M],
      ["Rotting Oranges", "rotting-oranges", M],
      ["Spiral Matrix", "spiral-matrix", M],
      ["Spiral Matrix II", "spiral-matrix-ii", M],
      ["Rotate Image", "rotate-image", M],
      ["Set Matrix Zeroes", "set-matrix-zeroes", M],
      ["Word Search", "word-search", M],
      ["Pacific Atlantic Water Flow", "pacific-atlantic-water-flow", M],
      ["Surrounded Regions", "surrounded-regions", M],
      ["01 Matrix", "01-matrix", M],
      ["Diagonal Traverse", "diagonal-traverse", M],
      ["Game of Life", "game-of-life", M],
      ["Shortest Path in Binary Matrix", "shortest-path-in-binary-matrix", M],
      ["Number of Distinct Islands", "number-of-distinct-islands", M],
      ["Where Will the Ball Fall", "where-will-the-ball-fall", M],
      ["Unique Paths III", "unique-paths-iii", H]
    ]
  },
  {
    name: "Heap / Priority Queue",
    rows: [
      ["Last Stone Weight", "last-stone-weight", E],
      ["Kth Largest Element in a Stream", "kth-largest-element-in-a-stream", E],
      ["The K Weakest Rows in a Matrix", "the-k-weakest-rows-in-a-matrix", E],
      ["Take Gifts From the Richest Pile", "take-gifts-from-the-richest-pile", E],
      ["Kth Largest Element in an Array", "kth-largest-element-in-an-array", M],
      ["Top K Frequent Elements", "top-k-frequent-elements", M],
      ["K Closest Points to Origin", "k-closest-points-to-origin", M],
      ["Task Scheduler", "task-scheduler", M],
      ["Reorganize String", "reorganize-string", M],
      ["Sort Characters By Frequency", "sort-characters-by-frequency", M],
      ["Minimum Cost to Connect Sticks", "minimum-cost-to-connect-sticks", M],
      ["Furthest Building You Can Reach", "furthest-building-you-can-reach", M],
      ["Single-Threaded CPU", "single-threaded-cpu", M],
      ["Maximum Subsequence Score", "maximum-subsequence-score", M],
      ["Find the Kth Largest Integer in the Array", "find-the-kth-largest-integer-in-the-array", M],
      ["Top K Frequent Words", "top-k-frequent-words", M],
      ["Seat Reservation Manager", "seat-reservation-manager", M],
      ["Total Cost to Hire K Workers", "total-cost-to-hire-k-workers", M],
      ["Maximum Performance of a Team", "maximum-performance-of-a-team", H],
      ["Process Tasks Using Servers", "process-tasks-using-servers", H]
    ]
  },
  {
    name: "Intervals (Merge / Insert / Overlap)",
    rows: [
      ["Merge Intervals", "merge-intervals", M],
      ["Insert Interval", "insert-interval", M],
      ["Non-overlapping Intervals", "non-overlapping-intervals", M],
      ["Minimum Number of Arrows to Burst Balloons", "minimum-number-of-arrows-to-burst-balloons", M],
      ["Interval List Intersections", "interval-list-intersections", M],
      ["My Calendar I", "my-calendar-i", M],
      ["My Calendar II", "my-calendar-ii", M],
      ["Car Pooling", "car-pooling", M],
      ["Maximum Number of Events That Can Be Attended", "maximum-number-of-events-that-can-be-attended", M],
      ["Video Stitching", "video-stitching", M],
      ["Remove Covered Intervals", "remove-covered-intervals", M],
      ["Partition Labels", "partition-labels", M],
      ["Teemo Attacking — substitute: Meeting Scheduler — substitute: Find Right Interval", "find-right-interval", M],
      ["Employee Free Time", "employee-free-time", H],
      ["My Calendar III", "my-calendar-iii", H],
      ["Minimum Interval to Include Each Query", "minimum-interval-to-include-each-query", H],
      ["Range Module", "range-module", H],
      ["Minimum Number of Taps to Open to Water a Garden", "minimum-number-of-taps-to-open-to-water-a-garden", H],
      ["Data Stream as Disjoint Intervals", "data-stream-as-disjoint-intervals", H],
      ["Falling Squares", "falling-squares", H]
    ]
  },
  {
    name: "Greedy",
    rows: [
      ["Lemonade Change", "lemonade-change", E],
      ["Maximum Units on a Truck", "maximum-units-on-a-truck", E],
      ["Jump Game", "jump-game", M],
      ["Jump Game II", "jump-game-ii", M],
      ["Gas Station", "gas-station", M],
      ["Partition Labels", "partition-labels", M],
      ["Task Scheduler", "task-scheduler", M],
      ["Non-overlapping Intervals", "non-overlapping-intervals", M],
      ["Minimum Number of Arrows to Burst Balloons", "minimum-number-of-arrows-to-burst-balloons", M],
      ["Best Time to Buy and Sell Stock II", "best-time-to-buy-and-sell-stock-ii", M],
      ["Two City Scheduling", "two-city-scheduling", M],
      ["Boats to Save People", "boats-to-save-people", M],
      ["Greedy Florist — substitute: Maximum Number of Events That Can Be Attended", "maximum-number-of-events-that-can-be-attended", M],
      ["Minimum Add to Make Parentheses Valid", "minimum-add-to-make-parentheses-valid", M],
      ["Remove K Digits", "remove-k-digits", M],
      ["Queue Reconstruction by Height", "queue-reconstruction-by-height", M],
      ["Wiggle Subsequence", "wiggle-subsequence", M],
      ["Candy", "candy", H],
      ["Minimum Number of Taps to Open to Water a Garden", "minimum-number-of-taps-to-open-to-water-a-garden", H],
      ["Course Schedule III", "course-schedule-iii", H]
    ]
  },
  {
    name: "Dynamic Programming - 2D / Grid",
    rows: [
      ["Unique Paths", "unique-paths", M],
      ["Unique Paths II", "unique-paths-ii", M],
      ["Minimum Path Sum", "minimum-path-sum", M],
      ["Longest Common Subsequence", "longest-common-subsequence", M],
      ["Maximal Square", "maximal-square", M],
      ["Triangle", "triangle", M],
      ["Interleaving String", "interleaving-string", M],
      ["Minimum Falling Path Sum", "minimum-falling-path-sum", M],
      ["Count Square Submatrices with All Ones", "count-square-submatrices-with-all-ones", M],
      ["Maximum Points You Can Obtain from Cards", "maximum-points-you-can-obtain-from-cards", M],
      ["Out of Boundary Paths", "out-of-boundary-paths", M],
      ["Where Will the Ball Fall", "where-will-the-ball-fall", M],
      ["Edit Distance", "edit-distance", H],
      ["Distinct Subsequences", "distinct-subsequences", H],
      ["Dungeon Game", "dungeon-game", H],
      ["Maximal Rectangle", "maximal-rectangle", H],
      ["Cherry Pickup", "cherry-pickup", H],
      ["Cherry Pickup II", "cherry-pickup-ii", H],
      ["Minimum Falling Path Sum II", "minimum-falling-path-sum-ii", H],
      ["Longest Increasing Path in a Matrix", "longest-increasing-path-in-a-matrix", H]
    ]
  },
  {
    name: "Sorting",
    rows: [
      ["Merge Sorted Array", "merge-sorted-array", E],
      ["Sort Array By Parity", "sort-array-by-parity", E],
      ["Relative Sort Array", "relative-sort-array", E],
      ["Sort the People", "sort-the-people", E],
      ["Sort Array by Increasing Frequency", "sort-array-by-increasing-frequency", E],
      ["Sort Integers by The Number of 1 Bits", "sort-integers-by-the-number-of-1-bits", E],
      ["Sort Colors", "sort-colors", M],
      ["Largest Number", "largest-number", M],
      ["Merge Intervals", "merge-intervals", M],
      ["Kth Largest Element in an Array", "kth-largest-element-in-an-array", M],
      ["Sort an Array", "sort-an-array", M],
      ["Wiggle Sort II", "wiggle-sort-ii", M],
      ["Queue Reconstruction by Height", "queue-reconstruction-by-height", M],
      ["Maximum Gap", "maximum-gap", M],
      ["Custom Sort String", "custom-sort-string", M],
      ["H-Index", "h-index", M],
      ["Minimum Increment to Make Array Unique", "minimum-increment-to-make-array-unique", M],
      ["Pancake Sorting", "pancake-sorting", M],
      ["Sort the Matrix Diagonally", "sort-the-matrix-diagonally", M],
      ["Boats to Save People", "boats-to-save-people", M]
    ]
  },
  {
    name: "Fast & Slow Pointers (Linked List)",
    rows: [
      ["Linked List Cycle", "linked-list-cycle", E],
      ["Middle of the Linked List", "middle-of-the-linked-list", E],
      ["Happy Number", "happy-number", E],
      ["Palindrome Linked List", "palindrome-linked-list", E],
      ["Intersection of Two Linked Lists", "intersection-of-two-linked-lists", E],
      ["Remove Duplicates from Sorted List", "remove-duplicates-from-sorted-list", E],
      ["Linked List Cycle II", "linked-list-cycle-ii", M],
      ["Remove Nth Node From End of List", "remove-nth-node-from-end-of-list", M],
      ["Find the Duplicate Number", "find-the-duplicate-number", M],
      ["Reorder List", "reorder-list", M],
      ["Maximum Twin Sum of a Linked List", "maximum-twin-sum-of-a-linked-list", M],
      ["Split Linked List in Parts", "split-linked-list-in-parts", M],
      ["Delete the Middle Node of a Linked List", "delete-the-middle-node-of-a-linked-list", M],
      ["Rotate List", "rotate-list", M],
      ["Convert Sorted List to Binary Search Tree", "convert-sorted-list-to-binary-search-tree", M],
      ["Linked List Components", "linked-list-components", M],
      ["Next Greater Node In Linked List", "next-greater-node-in-linked-list", M],
      ["Odd Even Linked List", "odd-even-linked-list", M],
      ["Partition List", "partition-list", M],
      ["Sort List", "sort-list", M]
    ]
  },
  {
    name: "Linked List Reversal / Manipulation",
    rows: [
      ["Reverse Linked List", "reverse-linked-list", E],
      ["Merge Two Sorted Lists", "merge-two-sorted-lists", E],
      ["Remove Linked List Elements", "remove-linked-list-elements", E],
      ["Convert Binary Number in a Linked List to Integer", "convert-binary-number-in-a-linked-list-to-integer", E],
      ["Reverse Linked List II", "reverse-linked-list-ii", M],
      ["Swap Nodes in Pairs", "swap-nodes-in-pairs", M],
      ["Add Two Numbers", "add-two-numbers", M],
      ["Add Two Numbers II", "add-two-numbers-ii", M],
      ["Copy List with Random Pointer", "copy-list-with-random-pointer", M],
      ["Flatten a Multilevel Doubly Linked List", "flatten-a-multilevel-doubly-linked-list", M],
      ["Design Linked List", "design-linked-list", M],
      ["Swapping Nodes in a Linked List", "swapping-nodes-in-a-linked-list", M],
      ["Insertion Sort List", "insertion-sort-list", M],
      ["Plus One Linked List", "plus-one-linked-list", M],
      ["Design a Stack With Increment Operation", "design-a-stack-with-increment-operation", M],
      ["Odd Even Linked List", "odd-even-linked-list", M],
      ["Merge In Between Linked Lists", "merge-in-between-linked-lists", M],
      ["LRU Cache", "lru-cache", M],
      ["Reverse Nodes in k-Group", "reverse-nodes-in-k-group", H],
      ["Merge k Sorted Lists", "merge-k-sorted-lists", H]
    ]
  },
  {
    name: "Binary Search Tree (BST)",
    rows: [
      ["Search in a Binary Search Tree", "search-in-a-binary-search-tree", E],
      ["Lowest Common Ancestor of a Binary Search Tree", "lowest-common-ancestor-of-a-binary-search-tree", E],
      ["Convert Sorted Array to Binary Search Tree", "convert-sorted-array-to-binary-search-tree", E],
      ["Minimum Absolute Difference in BST", "minimum-absolute-difference-in-bst", E],
      ["Range Sum of BST", "range-sum-of-bst", E],
      ["Two Sum IV - Input is a BST", "two-sum-iv-input-is-a-bst", E],
      ["Find Mode in Binary Search Tree", "find-mode-in-binary-search-tree", E],
      ["Closest Binary Search Tree Value", "closest-binary-search-tree-value", E],
      ["Validate Binary Search Tree", "validate-binary-search-tree", M],
      ["Insert into a Binary Search Tree", "insert-into-a-binary-search-tree", M],
      ["Delete Node in a BST", "delete-node-in-a-bst", M],
      ["Kth Smallest Element in a BST", "kth-smallest-element-in-a-bst", M],
      ["Convert BST to Greater Tree", "convert-bst-to-greater-tree", M],
      ["Balance a Binary Search Tree", "balance-a-binary-search-tree", M],
      ["Trim a Binary Search Tree", "trim-a-binary-search-tree", M],
      ["Recover Binary Search Tree", "recover-binary-search-tree", M],
      ["Unique Binary Search Trees", "unique-binary-search-trees", M],
      ["Unique Binary Search Trees II", "unique-binary-search-trees-ii", M],
      ["Binary Search Tree Iterator", "binary-search-tree-iterator", M],
      ["Construct Binary Search Tree from Preorder Traversal", "construct-binary-search-tree-from-preorder-traversal", M]
    ]
  },
  {
    name: "Bit Manipulation",
    rows: [
      ["Single Number", "single-number", E],
      ["Number of 1 Bits", "number-of-1-bits", E],
      ["Counting Bits", "counting-bits", E],
      ["Missing Number", "missing-number", E],
      ["Reverse Bits", "reverse-bits", E],
      ["Find the Difference", "find-the-difference", E],
      ["Binary Number with Alternating Bits", "binary-number-with-alternating-bits", E],
      ["XOR Operation in an Array", "xor-operation-in-an-array", E],
      ["Single Number II", "single-number-ii", M],
      ["Single Number III", "single-number-iii", M],
      ["Sum of Two Integers", "sum-of-two-integers", M],
      ["Bitwise AND of Numbers Range", "bitwise-and-of-numbers-range", M],
      ["Maximum XOR of Two Numbers in an Array", "maximum-xor-of-two-numbers-in-an-array", M],
      ["Total Hamming Distance", "total-hamming-distance", M],
      ["UTF-8 Validation", "utf-8-validation", M],
      ["Gray Code", "gray-code", M],
      ["Subsets", "subsets", M],
      ["Divide Two Integers", "divide-two-integers", M],
      ["Maximum Product of Word Lengths", "maximum-product-of-word-lengths", M],
      ["Minimum Flips to Make a OR b Equal to c", "minimum-flips-to-make-a-or-b-equal-to-c", M]
    ]
  },
  {
    name: "Dynamic Programming - Knapsack Style",
    rows: [
      ["Partition Equal Subset Sum", "partition-equal-subset-sum", M],
      ["Target Sum", "target-sum", M],
      ["Coin Change", "coin-change", M],
      ["Coin Change II", "coin-change-ii", M],
      ["Last Stone Weight II", "last-stone-weight-ii", M],
      ["Ones and Zeroes", "ones-and-zeroes", M],
      ["Combination Sum IV", "combination-sum-iv", M],
      ["Perfect Squares", "perfect-squares", M],
      ["Partition to K Equal Sum Subsets", "partition-to-k-equal-sum-subsets", M],
      ["Minimum Cost to Reach Destination in Time — substitute: Number of Dice Rolls With Target Sum", "number-of-dice-rolls-with-target-sum", M],
      ["Filling Bookcase Shelves", "filling-bookcase-shelves", M],
      ["Maximum Students Taking Exam — substitute: Shopping Offers", "shopping-offers", M],
      ["Form Largest Integer With Digit Costs", "form-largest-integer-with-digit-costs", M],
      ["Maximum Number of Points with Cost — substitute: Count Square Submatrices with All Ones", "count-square-submatrices-with-all-ones", M],
      ["Tallest Billboard", "tallest-billboard", H],
      ["Profitable Schemes", "profitable-schemes", H],
      ["Matrix Block Sum — substitute: Minimum Number of Refueling Stops", "minimum-number-of-refueling-stops", H],
      ["Maximum Value of K Coins From Piles", "maximum-value-of-k-coins-from-piles", H],
      ["Closest Subsequence Sum", "closest-subsequence-sum", H],
      ["Number of Ways to Stay in the Same Place After Some Steps", "number-of-ways-to-stay-in-the-same-place-after-some-steps", H]
    ]
  },
  {
    name: "Design Problems",
    rows: [
      ["Design HashMap", "design-hashmap", E],
      ["LRU Cache", "lru-cache", M],
      ["Min Stack", "min-stack", M],
      ["Implement Trie (Prefix Tree)", "implement-trie-prefix-tree", M],
      ["Design Twitter", "design-twitter", M],
      ["Insert Delete GetRandom O(1)", "insert-delete-getrandom-o1", M],
      ["Design Underground System", "design-underground-system", M],
      ["Design Browser History", "design-browser-history", M],
      ["Time Based Key-Value Store", "time-based-key-value-store", M],
      ["Design Circular Deque", "design-circular-deque", M],
      ["Snapshot Array", "snapshot-array", M],
      ["Design a Stack With Increment Operation", "design-a-stack-with-increment-operation", M],
      ["Online Stock Span", "online-stock-span", M],
      ["Design Add and Search Words Data Structure", "design-add-and-search-words-data-structure", M],
      ["Stock Price Fluctuation", "stock-price-fluctuation", M],
      ["Design a Food Rating System", "design-a-food-rating-system", M],
      ["Design Authentication Manager", "design-authentication-manager", M],
      ["LFU Cache", "lfu-cache", H],
      ["Find Median from Data Stream", "find-median-from-data-stream", H],
      ["Serialize and Deserialize Binary Tree", "serialize-and-deserialize-binary-tree", H]
    ]
  },
  {
    name: "Topological Sort",
    rows: [
      ["Course Schedule", "course-schedule", M],
      ["Course Schedule II", "course-schedule-ii", M],
      ["Find Eventual Safe States", "find-eventual-safe-states", M],
      ["Course Schedule IV", "course-schedule-iv", M],
      ["Minimum Height Trees", "minimum-height-trees", M],
      ["All Ancestors of a Node in a Directed Acyclic Graph", "all-ancestors-of-a-node-in-a-directed-acyclic-graph", M],
      ["Parallel Courses", "parallel-courses", M],
      ["Find All Possible Recipes from Given Supplies", "find-all-possible-recipes-from-given-supplies", M],
      ["Loud and Rich", "loud-and-rich", M],
      ["Minimum Number of Vertices to Reach All Nodes", "minimum-number-of-vertices-to-reach-all-nodes", M],
      ["Sequence Reconstruction", "sequence-reconstruction", M],
      ["Number of Ways to Arrive at Destination", "number-of-ways-to-arrive-at-destination", M],
      ["Detect Cycles in 2D Grid", "detect-cycles-in-2d-grid", M],
      ["Parallel Courses III", "parallel-courses-iii", H],
      ["Sort Items by Groups Respecting Dependencies", "sort-items-by-groups-respecting-dependencies", H],
      ["Build a Matrix With Conditions", "build-a-matrix-with-conditions", H],
      ["Largest Color Value in a Directed Graph", "largest-color-value-in-a-directed-graph", H],
      ["Maximum Employees to Be Invited to a Meeting", "maximum-employees-to-be-invited-to-a-meeting", H],
      ["Strange Printer II", "strange-printer-ii", H],
      ["Sum of Scores of Built Strings — substitute: Longest Cycle in a Graph", "longest-cycle-in-a-graph", H]
    ]
  },
  {
    name: "Union-Find (Disjoint Set)",
    rows: [
      ["Find if Path Exists in Graph", "find-if-path-exists-in-graph", E],
      ["Number of Provinces", "number-of-provinces", M],
      ["Redundant Connection", "redundant-connection", M],
      ["Accounts Merge", "accounts-merge", M],
      ["Most Stones Removed with Same Row or Column", "most-stones-removed-with-same-row-or-column", M],
      ["Number of Operations to Make Network Connected", "number-of-operations-to-make-network-connected", M],
      ["Satisfiability of Equality Equations", "satisfiability-of-equality-equations", M],
      ["Smallest String With Swaps", "smallest-string-with-swaps", M],
      ["Lexicographically Smallest Equivalent String", "lexicographically-smallest-equivalent-string", M],
      ["Count Unreachable Pairs of Nodes in an Undirected Graph", "count-unreachable-pairs-of-nodes-in-an-undirected-graph", M],
      ["Minimize Malware Spread", "minimize-malware-spread", M],
      ["Regions Cut By Slashes", "regions-cut-by-slashes", M],
      ["Longest Consecutive Sequence", "longest-consecutive-sequence", M],
      ["Minimize the Maximum of Two Arrays — substitute: The Earliest Moment When Everyone Become Friends", "the-earliest-moment-when-everyone-become-friends", M],
      ["Redundant Connection II", "redundant-connection-ii", H],
      ["Graph Connectivity With Threshold", "graph-connectivity-with-threshold", H],
      ["Making A Large Island", "making-a-large-island", H],
      ["Checking Existence of Edge Length Limited Paths", "checking-existence-of-edge-length-limited-paths", H],
      ["Largest Component Size by Common Factor", "largest-component-size-by-common-factor", H],
      ["Remove Max Number of Edges to Keep Graph Fully Traversable", "remove-max-number-of-edges-to-keep-graph-fully-traversable", H]
    ]
  },
  {
    name: "Trie (Prefix Tree)",
    rows: [
      ["Longest Word in Dictionary", "longest-word-in-dictionary", E],
      ["Count Pairs of Similar Strings — substitute: Index Pairs of a String", "index-pairs-of-a-string", E],
      ["Implement Trie (Prefix Tree)", "implement-trie-prefix-tree", M],
      ["Design Add and Search Words Data Structure", "design-add-and-search-words-data-structure", M],
      ["Implement Trie II (Prefix Tree)", "implement-trie-ii-prefix-tree", M],
      ["Replace Words", "replace-words", M],
      ["Map Sum Pairs", "map-sum-pairs", M],
      ["Maximum XOR of Two Numbers in an Array", "maximum-xor-of-two-numbers-in-an-array", M],
      ["Search Suggestions System", "search-suggestions-system", M],
      ["Word Break", "word-break", M],
      ["Camelcase Matching", "camelcase-matching", M],
      ["Number of Matching Subsequences", "number-of-matching-subsequences", M],
      ["Short Encoding of Words", "short-encoding-of-words", M],
      ["Word Search II", "word-search-ii", H],
      ["Concatenated Words", "concatenated-words", H],
      ["Stream of Characters", "stream-of-characters", H],
      ["Prefix and Suffix Search", "prefix-and-suffix-search", H],
      ["Maximum XOR With an Element From Array", "maximum-xor-with-an-element-from-array", H],
      ["Sum of Prefix Scores of Strings", "sum-of-prefix-scores-of-strings", H],
      ["Palindrome Pairs", "palindrome-pairs", H]
    ]
  },
  {
    name: "Cyclic Sort",
    rows: [
      ["Missing Number", "missing-number", E],
      ["Find All Numbers Disappeared in an Array", "find-all-numbers-disappeared-in-an-array", E],
      ["Set Mismatch", "set-mismatch", E],
      ["Move Zeroes", "move-zeroes", E],
      ["Degree of an Array", "degree-of-an-array", E],
      ["Number of Good Pairs", "number-of-good-pairs", E],
      ["Replace Elements with Greatest Element on Right Side", "replace-elements-with-greatest-element-on-right-side", E],
      ["Find the Difference", "find-the-difference", E],
      ["Single Number", "single-number", E],
      ["Find All Duplicates in an Array", "find-all-duplicates-in-an-array", M],
      ["Find the Duplicate Number", "find-the-duplicate-number", M],
      ["Sort Colors", "sort-colors", M],
      ["Minimum Number of Swaps to Make the String Balanced", "minimum-number-of-swaps-to-make-the-string-balanced", M],
      ["Array Nesting", "array-nesting", M],
      ["Maximum Swap", "maximum-swap", M],
      ["Smallest Range II", "smallest-range-ii", M],
      ["Wiggle Sort II", "wiggle-sort-ii", M],
      ["Maximum Number of Integers to Choose From a Range I", "maximum-number-of-integers-to-choose-from-a-range-i", M],
      ["First Missing Positive", "first-missing-positive", H],
      ["Couples Holding Hands", "couples-holding-hands", H]
    ]
  },
  {
    name: "Math / Number Theory",
    rows: [
      ["Palindrome Number", "palindrome-number", E],
      ["Sqrt(x)", "sqrtx", E],
      ["Roman to Integer", "roman-to-integer", E],
      ["Excel Sheet Column Number", "excel-sheet-column-number", E],
      ["Excel Sheet Column Title", "excel-sheet-column-title", E],
      ["Greatest Common Divisor of Strings", "greatest-common-divisor-of-strings", E],
      ["Happy Number", "happy-number", E],
      ["Add Digits", "add-digits", E],
      ["Ugly Number", "ugly-number", E],
      ["Self Dividing Numbers", "self-dividing-numbers", E],
      ["Reverse Integer", "reverse-integer", M],
      ["Pow(x, n)", "powx-n", M],
      ["Integer to Roman", "integer-to-roman", M],
      ["Count Primes", "count-primes", M],
      ["Factorial Trailing Zeroes", "factorial-trailing-zeroes", M],
      ["Fraction to Recurring Decimal", "fraction-to-recurring-decimal", M],
      ["Ugly Number II", "ugly-number-ii", M],
      ["Super Pow", "super-pow", M],
      ["Water and Jug Problem", "water-and-jug-problem", M],
      ["Nth Digit", "nth-digit", M]
    ]
  },
  {
    name: "Sliding Window Maximum / Minimum (Specific Variants)",
    rows: [
      ["Maximum Average Subarray I", "maximum-average-subarray-i", E],
      ["Maximum Sum of Almost Unique Subarray — substitute: Minimum Recolors to Get K Consecutive Black Blocks", "minimum-recolors-to-get-k-consecutive-black-blocks", E],
      ["Jump Game VI", "jump-game-vi", M],
      ["Maximum Number of Robots Within Budget", "maximum-number-of-robots-within-budget", M],
      ["Sum of Subarray Minimums", "sum-of-subarray-minimums", M],
      ["Sum of Subarray Ranges", "sum-of-subarray-ranges", M],
      ["Continuous Subarrays — substitute: Maximum Side Length of a Square with Sum Less than or Equal to Threshold", "maximum-side-length-of-a-square-with-sum-less-than-or-equal-to-threshold", M],
      ["Subarray Product Less Than K", "subarray-product-less-than-k", M],
      ["Longest Continuous Subarray With Absolute Diff Less Than or Equal to Limit", "longest-continuous-subarray-with-absolute-diff-less-than-or-equal-to-limit", M],
      ["Frequency of the Most Frequent Element", "frequency-of-the-most-frequent-element", M],
      ["Grumpy Bookstore Owner", "grumpy-bookstore-owner", M],
      ["Maximum Points You Can Obtain from Cards", "maximum-points-you-can-obtain-from-cards", M],
      ["Minimum Number of Flips to Make the Binary String Alternating", "minimum-number-of-flips-to-make-the-binary-string-alternating", M],
      ["Maximum Erasure Value", "maximum-erasure-value", M],
      ["Find the Longest Equal Subarray", "find-the-longest-equal-subarray", M],
      ["Sliding Window Maximum", "sliding-window-maximum", H],
      ["Shortest Subarray with Sum at Least K", "shortest-subarray-with-sum-at-least-k", H],
      ["Constrained Subsequence Sum", "constrained-subsequence-sum", H],
      ["Minimum Window Substring", "minimum-window-substring", H],
      ["Count Subarrays With Fixed Bounds", "count-subarrays-with-fixed-bounds", H]
    ]
  },
  {
    name: "Simulation / Array Rearrangement",
    rows: [
      ["Pascal's Triangle", "pascals-triangle", E],
      ["Reshape the Matrix", "reshape-the-matrix", E],
      ["Image Smoother", "image-smoother", E],
      ["Plus One", "plus-one", E],
      ["Rotate Array", "rotate-array", M],
      ["Spiral Matrix II", "spiral-matrix-ii", M],
      ["Game of Life", "game-of-life", M],
      ["Candy Crush", "candy-crush", M],
      ["Robot Bounded In Circle", "robot-bounded-in-circle", M],
      ["Spiral Matrix III", "spiral-matrix-iii", M],
      ["Design a Number Container System", "design-a-number-container-system", M],
      ["Snakes and Ladders", "snakes-and-ladders", M],
      ["Minesweeper", "minesweeper", M],
      ["Out of Boundary Paths", "out-of-boundary-paths", M],
      ["Diagonal Traverse II", "diagonal-traverse-ii", M],
      ["Cyclically Rotating a Grid", "cyclically-rotating-a-grid", M],
      ["Maximum Matrix Sum", "maximum-matrix-sum", M],
      ["Magic Squares In Grid", "magic-squares-in-grid", M],
      ["Rotating the Box", "rotating-the-box", M],
      ["Stamping the Grid", "stamping-the-grid", H]
    ]
  },
  {
    name: "Two Heaps",
    rows: [
      ["Take Gifts From the Richest Pile", "take-gifts-from-the-richest-pile", E],
      ["Kth Largest Element in a Stream", "kth-largest-element-in-a-stream", E],
      ["Last Stone Weight", "last-stone-weight", E],
      ["Minimum Cost to Hire K Workers — substitute: Total Cost to Hire K Workers", "total-cost-to-hire-k-workers", M],
      ["Furthest Building You Can Reach", "furthest-building-you-can-reach", M],
      ["Single-Threaded CPU", "single-threaded-cpu", M],
      ["Seat Reservation Manager", "seat-reservation-manager", M],
      ["Maximum Subsequence Score", "maximum-subsequence-score", M],
      ["The Number of the Smallest Unoccupied Chair", "the-number-of-the-smallest-unoccupied-chair", M],
      ["Maximum Average Pass Ratio", "maximum-average-pass-ratio", M],
      ["Find Right Interval", "find-right-interval", M],
      ["Reorganize String", "reorganize-string", M],
      ["Task Scheduler", "task-scheduler", M],
      ["Find Median from Data Stream", "find-median-from-data-stream", H],
      ["Sliding Window Median", "sliding-window-median", H],
      ["IPO", "ipo", H],
      ["Constrained Subsequence Sum", "constrained-subsequence-sum", H],
      ["Maximum Performance of a Team", "maximum-performance-of-a-team", H],
      ["Process Tasks Using Servers", "process-tasks-using-servers", H],
      ["Minimize Deviation in Array", "minimize-deviation-in-array", H]
    ]
  },
  {
    name: "K-way Merge",
    rows: [
      ["Merge Two Sorted Lists", "merge-two-sorted-lists", E],
      ["Merge Sorted Array", "merge-sorted-array", E],
      ["The K Weakest Rows in a Matrix", "the-k-weakest-rows-in-a-matrix", E],
      ["Kth Smallest Element in a Sorted Matrix", "kth-smallest-element-in-a-sorted-matrix", M],
      ["Find K Pairs with Smallest Sums", "find-k-pairs-with-smallest-sums", M],
      ["Ugly Number II", "ugly-number-ii", M],
      ["Super Ugly Number", "super-ugly-number", M],
      ["Sort the Matrix Diagonally", "sort-the-matrix-diagonally", M],
      ["Find K Closest Elements", "find-k-closest-elements", M],
      ["K Closest Points to Origin", "k-closest-points-to-origin", M],
      ["Minimum Cost to Connect Sticks", "minimum-cost-to-connect-sticks", M],
      ["Maximum Number of Eaten Apples", "maximum-number-of-eaten-apples", M],
      ["Top K Frequent Elements", "top-k-frequent-elements", M],
      ["Kth Largest Element in an Array", "kth-largest-element-in-an-array", M],
      ["Merge k Sorted Lists", "merge-k-sorted-lists", H],
      ["Smallest Range Covering Elements from K Lists", "smallest-range-covering-elements-from-k-lists", H],
      ["Kth Smallest Number in Multiplication Table", "kth-smallest-number-in-multiplication-table", H],
      ["Find K-th Smallest Pair Distance", "find-k-th-smallest-pair-distance", H],
      ["K-th Smallest Prime Fraction", "k-th-smallest-prime-fraction", H],
      ["Find the Kth Smallest Sum of a Matrix With Sorted Rows", "find-the-kth-smallest-sum-of-a-matrix-with-sorted-rows", H]
    ]
  },
  {
    name: "Game Theory / Minimax",
    rows: [
      ["Nim Game", "nim-game", E],
      ["Divisor Game", "divisor-game", E],
      ["Optimal Strategy — substitute: Flip Game", "flip-game", E],
      ["Stone Game", "stone-game", M],
      ["Stone Game II", "stone-game-ii", M],
      ["Stone Game VI", "stone-game-vi", M],
      ["Stone Game VII", "stone-game-vii", M],
      ["Predict the Winner", "predict-the-winner", M],
      ["Can I Win", "can-i-win", M],
      ["Guess Number Higher or Lower II", "guess-number-higher-or-lower-ii", M],
      ["Minimax Game — substitute: Min and Max", "find-the-most-competitive-subsequence", M],
      ["Find the Winner of the Circular Game", "find-the-winner-of-the-circular-game", M],
      ["Maximum Number of Coins You Can Get", "maximum-number-of-coins-you-can-get", M],
      ["Stone Game IX", "stone-game-ix", M],
      ["Maximum Score from Performing Multiplication Operations", "maximum-score-from-performing-multiplication-operations", M],
      ["Stone Game III", "stone-game-iii", H],
      ["Stone Game IV", "stone-game-iv", H],
      ["Cat and Mouse", "cat-and-mouse", H],
      ["Minimum Number of Moves to Make Palindrome", "minimum-number-of-moves-to-make-palindrome", H],
      ["Stone Game VIII", "stone-game-viii", H]
    ]
  },
  {
    name: "Segment Tree",
    rows: [
      ["Range Sum Query - Mutable", "range-sum-query-mutable", M],
      ["My Calendar I", "my-calendar-i", M],
      ["My Calendar II", "my-calendar-ii", M],
      ["Create Sorted Array through Instructions", "create-sorted-array-through-instructions", M],
      ["Number of Longest Increasing Subsequence", "number-of-longest-increasing-subsequence", M],
      ["Range Frequency Queries", "range-frequency-queries", M],
      ["Longest Uploaded Prefix", "longest-uploaded-prefix", M],
      ["Count of Smaller Numbers After Self", "count-of-smaller-numbers-after-self", H],
      ["Count of Range Sum", "count-of-range-sum", H],
      ["Reverse Pairs", "reverse-pairs", H],
      ["The Skyline Problem", "the-skyline-problem", H],
      ["Falling Squares", "falling-squares", H],
      ["Range Module", "range-module", H],
      ["My Calendar III", "my-calendar-iii", H],
      ["Rectangle Area II", "rectangle-area-ii", H],
      ["Longest Increasing Subsequence II", "longest-increasing-subsequence-ii", H],
      ["Handling Sum Queries After Update", "handling-sum-queries-after-update", H],
      ["Booking Concert Tickets in Groups", "booking-concert-tickets-in-groups", H],
      ["Find Building Where Alice and Bob Can Meet", "find-building-where-alice-and-bob-can-meet", H],
      ["Number of Pairs Satisfying Inequality", "number-of-pairs-satisfying-inequality", H]
    ]
  },
  {
    name: "Binary Indexed Tree (Fenwick Tree)",
    rows: [
      ["Range Sum Query - Mutable", "range-sum-query-mutable", M],
      ["Range Sum Query 2D - Mutable — substitute: Range Sum Query 2D - Immutable", "range-sum-query-2d-immutable", M],
      ["Create Sorted Array through Instructions", "create-sorted-array-through-instructions", M],
      ["Queue Reconstruction by Height", "queue-reconstruction-by-height", M],
      ["Count Number of Teams", "count-number-of-teams", M],
      ["Longest Increasing Subsequence", "longest-increasing-subsequence", M],
      ["Number of Longest Increasing Subsequence", "number-of-longest-increasing-subsequence", M],
      ["The Number of Weak Characters in the Game", "the-number-of-weak-characters-in-the-game", M],
      ["Best Team With No Conflicts", "best-team-with-no-conflicts", M],
      ["Range Frequency Queries", "range-frequency-queries", M],
      ["Count of Smaller Numbers After Self", "count-of-smaller-numbers-after-self", H],
      ["Count of Range Sum", "count-of-range-sum", H],
      ["Reverse Pairs", "reverse-pairs", H],
      ["Russian Doll Envelopes", "russian-doll-envelopes", H],
      ["Number of Pairs Satisfying Inequality", "number-of-pairs-satisfying-inequality", H],
      ["Make Array Empty", "make-array-empty", H],
      ["Count Good Triplets in an Array", "count-good-triplets-in-an-array", H],
      ["Maximum Balanced Subsequence Sum", "maximum-balanced-subsequence-sum", H],
      ["Sum of Floored Pairs", "sum-of-floored-pairs", H],
      ["Peaks in Array", "peaks-in-array", H]
    ]
  }
];

export const LEETCODE_PATTERNS: LeetPattern[] = RAW_PATTERNS.map((pattern, patternIndex) => {
  const id = patternIndex + 1;
  const slug = slugify(pattern.name);
  return {
    id,
    slug,
    name: pattern.name,
    problems: pattern.rows.map(([title, problemSlug, difficulty]) => ({
      key: `${slug}:${problemSlug}`,
      title,
      slug: problemSlug,
      url: `${LEETCODE_URL_BASE}${problemSlug}/`,
      difficulty
    }))
  };
});

// Fail fast in development if two patterns collapse to the same slug (which
// would make their URLs and stored notes collide).
if (process.env.NODE_ENV !== "production") {
  const seen = new Set<string>();
  for (const pattern of LEETCODE_PATTERNS) {
    if (seen.has(pattern.slug)) {
      throw new Error(`Duplicate pattern slug "${pattern.slug}" for "${pattern.name}"`);
    }
    seen.add(pattern.slug);
  }
}

export const TOTAL_PROBLEMS = LEETCODE_PATTERNS.reduce((sum, pattern) => sum + pattern.problems.length, 0);
